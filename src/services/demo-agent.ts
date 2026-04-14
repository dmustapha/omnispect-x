import { createWalletClient, createPublicClient, http, keccak256, toBytes, defineChain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { okxClient } from "../lib/okx-client";
import { scoreTrust } from "./trust-scorer";
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

// ─── Wallet Setup ───────────────────────────────────────────────────────────

const account = privateKeyToAccount(config.agentWallet.privateKey as Hex);

const walletClient = createWalletClient({
  account,
  chain: xlayer,
  transport: http(config.xlayer.rpcUrl),
});

const publicClient = createPublicClient({
  chain: xlayer,
  transport: http(config.xlayer.rpcUrl),
});

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
  // Pin reasoning to IPFS
  const reasoningURI = await pinToIPFS(reasoning);
  const reasoningHash = keccak256(toBytes(JSON.stringify(reasoning)));
  const decisionId = keccak256(toBytes(`${Date.now()}-${actionType}-${Math.random()}`));

  // Write to contract
  const hash = await walletClient.writeContract({
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

  await publicClient.waitForTransactionReceipt({ hash });
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
  state.currentCycle++;

  try {
    // ── Phase 1: Signal Collection ──
    emit("agent:signal", { phase: "collecting", cycle: state.currentCycle });

    const smartMoneyData = await okxClient.dexSignal.smartMoney("196", 10);
    if (smartMoneyData.length === 0) {
      emit("agent:signal", { phase: "no_signals", cycle: state.currentCycle });
      return scheduleCycle();
    }

    // Pick strongest signal (highest amount)
    const topSignal = smartMoneyData.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0];

    // Log signal collection
    await logDecisionOnChain(
      { phase: "signal", signals: smartMoneyData.slice(0, 3), topSignal },
      0 // SIGNAL_COLLECTED
    );

    emit("agent:signal", { phase: "collected", topSignal, signalCount: smartMoneyData.length });

    // ── Phase 2: Analysis ──
    emit("agent:analysis", { phase: "analyzing", token: topSignal.tokenAddress });

    const [priceData, marketData] = await Promise.allSettled([
      okxClient.dexMarket.price(topSignal.tokenAddress, "196"),
      okxClient.dexMarket.kline(topSignal.tokenAddress, "1H", "196"),
    ]);

    const tokenPrice = priceData.status === "fulfilled" ? priceData.value : null;
    const klines = marketData.status === "fulfilled" ? marketData.value : [];

    const confidence = analyzeSignal(topSignal, tokenPrice, klines);

    await logDecisionOnChain(
      { phase: "analysis", token: topSignal.tokenAddress, confidence, price: tokenPrice, klineCount: klines.length },
      1 // ANALYSIS_COMPLETE
    );

    emit("agent:analysis", { phase: "complete", confidence, token: topSignal.tokenAddress });

    if (confidence < agentConfig.confidenceFloor) {
      emit("agent:analysis", { phase: "skipped", reason: "confidence_below_floor", confidence, floor: agentConfig.confidenceFloor });
      return scheduleCycle();
    }

    // ── Phase 3: Trust Gate ──
    emit("agent:trust-check", { phase: "checking", target: topSignal.tokenAddress });

    const trustReport = await scoreTrust({ agentAddress: topSignal.address });

    await logDecisionOnChain(
      { phase: "trust_check", target: topSignal.address, score: trustReport.overallScore, classification: trustReport.classification },
      2 // TRUST_CHECK
    );

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
        userWalletAddress: account.address,
      });

      const hash = await walletClient.sendTransaction({
        to: swapData.tx.to as `0x${string}`,
        data: swapData.tx.data as `0x${string}`,
        value: BigInt(swapData.tx.value),
      });

      await publicClient.waitForTransactionReceipt({ hash });
      swapTxHash = hash;

      emit("agent:swap", { phase: "complete", txHash: hash, token: topSignal.tokenAddress });
    } catch (err) {
      emit("agent:error", { phase: "swap_failed", error: String(err) });
    }

    // ── Phase 5: Log Lineage ──
    const lineageId = await logDecisionOnChain(
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
  const isReg = await publicClient.readContract({
    address: contractAddress,
    abi: LINEAGE_WRITE_ABI,
    functionName: "isRegistered",
    args: [account.address],
  });

  if (!isReg) {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: LINEAGE_WRITE_ABI,
      functionName: "registerAgent",
      args: ["Omnispect-X Demo Agent v1"],
    });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  emit("agent:cycle-complete", { phase: "started", address: account.address });
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
