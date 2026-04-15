import { createWalletClient, createPublicClient, http, keccak256, toBytes, defineChain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { okxClient } from "../lib/okx-client";
import { scoreTrust } from "./trust-scorer";
import { generateReasoning } from "./llm-reasoning";
import { broadcast } from "../server/ws";
import { config } from "../config";
import type { AgentConfig, AgentState, CycleEvent, SmartMoneyActivity } from "../types";

// ─── Contract ABI (write subset) ───────────────────────────────────────────

const LINEAGE_WRITE_ABI = [
  {
    name: "registerAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "metadata", type: "string" }],
    outputs: [],
  },
  {
    name: "logDecision",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "decisionId", type: "bytes32" },
      { name: "reasoningHash", type: "bytes32" },
      { name: "reasoningURI", type: "string" },
      { name: "actionType", type: "uint8" },
      { name: "resultTxHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ─── Chain Definition ────────────────────────────────────────────────────────

const xlayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [config.xlayer.rpcUrl] } },
});

// ─── Lazy Wallet Setup (avoids crash on missing PRIVATE_KEY) ────────────────

function lazyAccount() {
  if (!config.agentWallet.privateKey) throw new Error("PRIVATE_KEY env var is required to run the demo agent");
  return privateKeyToAccount(config.agentWallet.privateKey as Hex);
}

let _memo: {
  account: ReturnType<typeof privateKeyToAccount>;
  wallet: ReturnType<typeof createWalletClient<ReturnType<typeof http>, typeof xlayer, ReturnType<typeof privateKeyToAccount>>>;
  public: ReturnType<typeof createPublicClient<ReturnType<typeof http>, typeof xlayer>>;
} | null = null;

function ensureWallet() {
  if (!_memo) {
    const account = lazyAccount();
    _memo = {
      account,
      wallet: createWalletClient({ account, chain: xlayer, transport: http(config.xlayer.rpcUrl) }),
      public: createPublicClient({ chain: xlayer, transport: http(config.xlayer.rpcUrl) }),
    };
  }
  return _memo;
}

function getAccount() { return ensureWallet().account; }
function getWalletClient() { return ensureWallet().wallet; }
function getPublicClient() { return ensureWallet().public; }

const contractAddress = config.xlayer.lineageLoggerAddress as `0x${string}`;

// ─── IPFS Pinning ───────────────────────────────────────────────────────────

async function pinToIPFS(payload: Record<string, unknown>): Promise<string> {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.ipfs.pinataJwt}`,
    },
    body: JSON.stringify({ pinataContent: payload }),
  });
  if (!res.ok) throw new Error(`Pinata pin failed: ${res.status}`);
  const json = await res.json() as { IpfsHash: string };
  return `ipfs://${json.IpfsHash}`;
}

// ─── Lineage Logging ────────────────────────────────────────────────────────

async function logDecisionOnChain(
  reasoning: Record<string, unknown>,
  actionType: number,
  resultTxHash: string = "0x" + "0".repeat(64)
): Promise<string> {
  // Pin reasoning to IPFS (best-effort — don't crash cycle if Pinata is down/unconfigured)
  let reasoningURI = "ipfs://unavailable";
  try {
    reasoningURI = await pinToIPFS(reasoning);
  } catch (err) {
    console.warn(`[demo-agent] IPFS pin failed, logging without URI: ${err}`);
  }
  const reasoningHash = keccak256(toBytes(JSON.stringify(reasoning)));
  const decisionId = keccak256(toBytes(`${Date.now()}-${actionType}-${Math.random()}`));

  // Write to contract
  const hash = await getWalletClient().writeContract({
    address: contractAddress,
    abi: LINEAGE_WRITE_ABI,
    functionName: "logDecision",
    args: [
      decisionId as Hex,
      reasoningHash as Hex,
      reasoningURI,
      actionType,
      resultTxHash as Hex,
    ],
  });

  await getPublicClient().waitForTransactionReceipt({ hash });
  return decisionId;
}

// ─── Agent State ────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AgentConfig = {
  strategy: "whale-follow",
  confidenceFloor: 0.7,
  trustFloor: 60,
  maxPositionSize: "100",
  cycleInterval: 30000,
  circuitBreaker: {
    maxLossPercent: 10,
    maxConsecutiveLosses: 3,
  },
};

let state: AgentState = {
  running: false,
  currentCycle: 0,
  totalPnl: 0,
  consecutiveLosses: 0,
  lastDecisionId: null,
  positions: [],
};

let agentConfig = DEFAULT_CONFIG;
let cycleTimer: ReturnType<typeof setTimeout> | null = null;

// ─── Event Emission ─────────────────────────────────────────────────────────

function emit(type: CycleEvent["type"], data: Record<string, unknown>) {
  const event: CycleEvent = { type, data, timestamp: Date.now(), cycle: state.currentCycle };
  broadcast(event);
}

// ─── 5-Phase Cycle ──────────────────────────────────────────────────────────

async function runCycle() {
  if (!state.running) return;

  // Circuit breaker check
  if (state.consecutiveLosses >= agentConfig.circuitBreaker.maxConsecutiveLosses) {
    emit("agent:error", { phase: "circuit_breaker", reason: "max_consecutive_losses", losses: state.consecutiveLosses });
    stopAgent();
    return;
  }

  state.currentCycle++;

  try {
    // ── Phase 1: Signal Collection ──
    emit("agent:signal", { phase: "collecting", cycle: state.currentCycle });

    let smartMoneyData: SmartMoneyActivity[] = [];
    let signalSource = "live";
    try {
      // Try ETH mainnet first (most smart money data), then cross-chain
      smartMoneyData = await okxClient.dexSignal.smartMoney("1", 10);
    } catch {
      try {
        smartMoneyData = await okxClient.dexSignal.smartMoney("56", 10);
      } catch {
        // All API calls failed — use demo signals
      }
    }

    if (smartMoneyData.length === 0) {
      signalSource = "demo";
      smartMoneyData = [
        { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", tokenAddress: "0x5a3e6a77ba2f983ec0d371ea3b475f8bc0811ad5", action: "buy", amount: "15000", ts: Date.now() },
        { address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", tokenAddress: "0x8c4037faa47b089e42a02f5c6973e2463e2e2a31", action: "buy", amount: "8500", ts: Date.now() },
        { address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18", tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", action: "sell", amount: "22000", ts: Date.now() },
      ];
      emit("agent:signal", { phase: "fallback", reason: "api_unavailable", source: "demo", cycle: state.currentCycle });
    }

    // Pick strongest signal (highest amount)
    const topSignal = smartMoneyData.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0];

    // Log signal collection (best-effort — don't crash cycle on logging failure)
    try {
      await logDecisionOnChain(
        { phase: "signal", signals: smartMoneyData.slice(0, 3), topSignal },
        0 // SIGNAL_COLLECTED
      );
    } catch (e) { console.warn(`[demo-agent] On-chain log failed (signal): ${e}`); }

    emit("agent:signal", { phase: "collected", topSignal, signalCount: smartMoneyData.length, source: signalSource });

    // ── Phase 2: Analysis ──
    emit("agent:analysis", { phase: "analyzing", token: topSignal.tokenAddress });

    const [priceData, marketData] = await Promise.allSettled([
      okxClient.dexMarket.price(topSignal.tokenAddress, "196"),
      okxClient.dexMarket.kline(topSignal.tokenAddress, "1H", "196"),
    ]);

    const tokenPrice = priceData.status === "fulfilled" ? priceData.value : null;
    const klines = marketData.status === "fulfilled" ? marketData.value : [];

    let confidence: number;
    let reasoning: string | undefined;
    try {
      const llmResult = await generateReasoning({
        signal: topSignal,
        priceInfo: tokenPrice,
        klines,
      });
      confidence = llmResult.confidence;
      reasoning = llmResult.reasoning;
    } catch {
      // Fallback to algorithmic analysis
      confidence = analyzeSignal(topSignal, tokenPrice, klines);
    }

    try {
      await logDecisionOnChain(
        { phase: "analysis", token: topSignal.tokenAddress, confidence, reasoning, price: tokenPrice, klineCount: klines.length },
        1 // ANALYSIS_COMPLETE
      );
    } catch (e) { console.warn(`[demo-agent] On-chain log failed (analysis): ${e}`); }

    emit("agent:analysis", { phase: "complete", confidence, reasoning, token: topSignal.tokenAddress });

    if (confidence < agentConfig.confidenceFloor) {
      emit("agent:analysis", { phase: "skipped", reason: "confidence_below_floor", confidence, floor: agentConfig.confidenceFloor });
      return scheduleCycle();
    }

    // ── Phase 3: Trust Gate ──
    emit("agent:trust-check", { phase: "checking", target: topSignal.address });

    const trustReport = await scoreTrust({ agentAddress: topSignal.address });

    try {
      await logDecisionOnChain(
        { phase: "trust_check", target: topSignal.address, score: trustReport.overallScore, classification: trustReport.classification },
        2 // TRUST_CHECK
      );
    } catch (e) { console.warn(`[demo-agent] On-chain log failed (trust): ${e}`); }

    emit("agent:trust-check", {
      phase: "complete",
      score: trustReport.overallScore,
      classification: trustReport.classification,
    });

    if (trustReport.overallScore < agentConfig.trustFloor) {
      emit("agent:trust-check", { phase: "rejected", reason: "trust_below_floor", score: trustReport.overallScore });
      return scheduleCycle();
    }

    // ── Phase 4: Execute Swap ──
    emit("agent:swap", { phase: "executing", token: topSignal.tokenAddress, action: topSignal.action });

    const NATIVE_OKB = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const swapAmount = "100000000000000000"; // 0.1 OKB

    let swapTxHash = "0x" + "0".repeat(64);
    try {
      const swapData = await okxClient.dexSwap.swap({
        chainIndex: "196",
        fromTokenAddress: NATIVE_OKB,
        toTokenAddress: topSignal.tokenAddress,
        amount: swapAmount,
        slippage: "0.01",
        userWalletAddress: getAccount().address,
      });

      const hash = await getWalletClient().sendTransaction({
        to: swapData.tx.to as `0x${string}`,
        data: swapData.tx.data as `0x${string}`,
        value: BigInt(swapData.tx.value),
      });

      await getPublicClient().waitForTransactionReceipt({ hash });
      swapTxHash = hash;

      emit("agent:swap", { phase: "complete", txHash: hash, token: topSignal.tokenAddress });
    } catch (err) {
      emit("agent:error", { phase: "swap_failed", error: String(err) });
      try {
        await logDecisionOnChain(
          { phase: "swap_failed", token: topSignal.tokenAddress, error: String(err), confidence },
          6, // EMERGENCY_STOP
        );
      } catch (logErr) { console.warn(`[demo-agent] Failed to log swap failure on-chain: ${logErr}`); }
      return scheduleCycle();
    }

    // ── Phase 5: Log Lineage ──
    let lineageId: string | null = null;
    try {
      lineageId = await logDecisionOnChain(
        {
          phase: "swap_executed",
          token: topSignal.tokenAddress,
          amount: swapAmount,
          confidence,
          trustScore: trustReport.overallScore,
          signals: [topSignal],
        },
        3, // SWAP_EXECUTED
        swapTxHash
      );
    } catch (e) { console.warn(`[demo-agent] On-chain log failed (lineage): ${e}`); }

    state.lastDecisionId = lineageId;
    emit("agent:lineage-logged", { phase: "logged", decisionId: lineageId, txHash: swapTxHash });
    emit("agent:cycle-complete", { cycle: state.currentCycle, pnl: state.totalPnl });

  } catch (err) {
    emit("agent:error", { error: String(err), cycle: state.currentCycle });
  }

  scheduleCycle();
}

// ─── Signal Analysis ────────────────────────────────────────────────────────

function analyzeSignal(
  signal: SmartMoneyActivity,
  priceInfo: { price: string; change24h: string } | null,
  klines: { vol: string; c: string }[]
): number {
  let confidence = 0.5;

  const amount = parseFloat(signal.amount);
  if (amount > 10000) confidence += 0.15;
  else if (amount > 1000) confidence += 0.1;

  if (priceInfo) {
    const change = parseFloat(priceInfo.change24h);
    if (change > 5 && signal.action === "buy") confidence += 0.1;
    if (change < -5 && signal.action === "sell") confidence += 0.1;
    if (change > 20 && signal.action === "buy") confidence -= 0.1;
  }

  if (klines.length >= 3) {
    const recentVol = klines.slice(-3).reduce((s, k) => s + parseFloat(k.vol), 0) / 3;
    const olderVol = klines.slice(0, 3).reduce((s, k) => s + parseFloat(k.vol), 0) / 3;
    if (olderVol > 0 && recentVol > olderVol * 1.5) confidence += 0.1;
  }

  return Math.max(0, Math.min(1, confidence));
}

// ─── Control ────────────────────────────────────────────────────────────────

function scheduleCycle() {
  if (!state.running) return;
  cycleTimer = setTimeout(runCycle, agentConfig.cycleInterval);
}

export async function startAgent(overrides?: Partial<AgentConfig>) {
  if (state.running) return;

  agentConfig = { ...DEFAULT_CONFIG, ...overrides };
  state = { running: true, currentCycle: 0, totalPnl: 0, consecutiveLosses: 0, lastDecisionId: null, positions: [] };

  // Ensure agent is registered
  const isReg = await getPublicClient().readContract({
    address: contractAddress,
    abi: LINEAGE_WRITE_ABI,
    functionName: "isRegistered",
    args: [getAccount().address],
  });

  if (!isReg) {
    const hash = await getWalletClient().writeContract({
      address: contractAddress,
      abi: LINEAGE_WRITE_ABI,
      functionName: "registerAgent",
      args: ["Omnispect-X Demo Agent v1"],
    });
    await getPublicClient().waitForTransactionReceipt({ hash });
  }

  emit("agent:cycle-complete", { phase: "started", address: getAccount().address });
  runCycle();
}

export function stopAgent() {
  state.running = false;
  if (cycleTimer) clearTimeout(cycleTimer);
  emit("agent:cycle-complete", { phase: "stopped" });
}

export function getAgentState(): AgentState {
  return { ...state };
}

export const demoAgent = { start: startAgent, stop: stopAgent, getState: getAgentState };
