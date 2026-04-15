import { randomBytes } from "crypto";
import { keccak256, toBytes, type Hex } from "viem";
import { callMcpTool } from "../lib/mcp-client";
import { broadcast } from "../server/ws";
import { getChainClients, getAgentAccount } from "../lib/chains";
import { config } from "../config";
import type {
  AgentConfig,
  AgentState,
  CycleEvent,
  SmartMoneyActivity,
  PriceInfo,
  KlineData,
  TrustScoreResponse,
  SwapQuote,
  SwapResult,
} from "../types";

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

// ─── Multi-Chain Wallet Access ──────────────────────────────────────────────
// X Layer clients for contract interactions (lineage contract lives on X Layer)
const X_LAYER = "196";
function xlayerClients() { return getChainClients(X_LAYER); }
function getAccount() { return getAgentAccount(); }

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
  let reasoningURI: string;
  try {
    reasoningURI = await pinToIPFS(reasoning);
  } catch (err) {
    console.warn(`[demo-agent] IPFS pin failed, skipping on-chain log: ${err}`);
    return `skipped-${Date.now()}`;
  }
  const reasoningHash = keccak256(toBytes(JSON.stringify(reasoning)));
  const decisionId = keccak256(toBytes(`${Date.now()}-${actionType}-${randomBytes(16).toString("hex")}`));

  const xl = xlayerClients();
  const hash = await xl.wallet.writeContract({
    chain: xl.chain,
    account: getAccount(),
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

  await xl.public.waitForTransactionReceipt({ hash });
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

// ─── 5-Phase Cycle (MCP-routed) ────────────────────────────────────────────

async function runCycle() {
  if (!state.running) return;

  // Circuit breaker check (CRIT-2 fix: now uses real tracked values)
  if (state.consecutiveLosses >= agentConfig.circuitBreaker.maxConsecutiveLosses) {
    emit("agent:error", { phase: "circuit_breaker", reason: "max_consecutive_losses", losses: state.consecutiveLosses });
    stopAgent();
    return;
  }

  // PnL circuit breaker (CRIT-2 fix: check maxLossPercent)
  if (state.totalPnl < -(agentConfig.circuitBreaker.maxLossPercent)) {
    emit("agent:error", { phase: "circuit_breaker", reason: "max_loss_exceeded", totalPnl: state.totalPnl });
    stopAgent();
    return;
  }

  state.currentCycle++;

  try {
    // ── Phase 0: Check & Exit Existing Positions (CRIT-3 fix) ──
    await evaluateExistingPositions();

    // ── Phase 1: Signal Collection (via MCP) ──
    emit("agent:signal", { phase: "collecting", cycle: state.currentCycle });

    let smartMoneyData: SmartMoneyActivity[] = [];
    let signalChainId = "1";
    let signalSource = "live";

    // Try collecting signals: ETH → BSC → X Layer → demo fallback
    const signalChains = ["1", "56", "196"];
    for (const chain of signalChains) {
      try {
        smartMoneyData = await callMcpTool<SmartMoneyActivity[]>("smart-money-signals", { chainId: chain, limit: 10 });
        if (smartMoneyData.length > 0) {
          signalChainId = chain;
          break;
        }
      } catch {
        // This chain's API failed, try next
      }
    }

    if (smartMoneyData.length === 0) {
      signalSource = "demo";
      signalChainId = "196";
      smartMoneyData = [
        { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", tokenAddress: "0x5a3e6a77ba2f983ec0d371ea3b475f8bc0811ad5", action: "buy", amount: "15000", ts: Date.now() },
        { address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", tokenAddress: "0x8c4037faa47b089e42a02f5c6973e2463e2e2a31", action: "buy", amount: "8500", ts: Date.now() },
        { address: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18", tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", action: "sell", amount: "22000", ts: Date.now() },
      ];
      emit("agent:signal", { phase: "fallback", reason: "api_unavailable", source: "demo", cycle: state.currentCycle });
    }

    // Pick strongest BUY signal — skip stablecoins (price near $1 with <1% change)
    const buySignals = smartMoneyData.filter(s => s.action === "buy");
    const nonStable = buySignals.filter(s => {
      const p = parseFloat(s.price || "0");
      const ch = Math.abs(parseFloat(s.change || "0"));
      return !(p > 0.95 && p < 1.05 && ch < 1); // filter USD-pegged stablecoins
    });
    const candidates = nonStable.length > 0 ? nonStable : buySignals.length > 0 ? buySignals : smartMoneyData;
    // Score by: positive change (weight 2) + high volume (weight 1)
    const topSignal = candidates.sort((a, b) => {
      const aScore = parseFloat(a.change || "0") * 2 + Math.log10(Math.max(1, parseFloat(a.amount)));
      const bScore = parseFloat(b.change || "0") * 2 + Math.log10(Math.max(1, parseFloat(b.amount)));
      return bScore - aScore;
    })[0];

    // Log signal collection
    try {
      await logDecisionOnChain(
        { phase: "signal", signals: smartMoneyData.slice(0, 3), topSignal, chainId: signalChainId },
        0 // SIGNAL_COLLECTED
      );
    } catch (e) { console.warn(`[demo-agent] On-chain log failed (signal): ${e}`); }

    emit("agent:signal", { phase: "collected", topSignal, signalCount: smartMoneyData.length, source: signalSource, chainId: signalChainId });

    // ── Phase 2: Analysis (via MCP) ── CRIT-1 fix: use signal's chain for price/kline
    emit("agent:analysis", { phase: "analyzing", token: topSignal.tokenAddress, chainId: signalChainId });

    let tokenPrice: PriceInfo | null = null;
    let klines: KlineData[] = [];

    try {
      tokenPrice = await callMcpTool<PriceInfo | null>("token-price", {
        tokenAddress: topSignal.tokenAddress,
        chainId: signalChainId,
      });
    } catch { /* price fetch failed */ }

    // Fallback: use price/change from the smart money signal if MCP price call failed
    if (!tokenPrice && topSignal.price) {
      tokenPrice = { price: topSignal.price, change24h: topSignal.change ?? "0", volume24h: topSignal.amount };
    }

    try {
      klines = await callMcpTool<KlineData[]>("token-klines", {
        tokenAddress: topSignal.tokenAddress,
        chainId: signalChainId,
      });
    } catch { /* kline fetch failed */ }

    let confidence: number;
    let reasoning: string | undefined;
    try {
      const llmResult = await callMcpTool<{ confidence: number; reasoning: string }>("llm-analyze", {
        tokenAddress: topSignal.tokenAddress,
        whaleAddress: topSignal.address,
        action: topSignal.action,
        amount: topSignal.amount,
        price: tokenPrice?.price,
        change24h: tokenPrice?.change24h,
        klines: klines.slice(-5).map(k => ({ vol: k.vol, c: k.c })),
      });
      confidence = llmResult.confidence;
      reasoning = llmResult.reasoning;
    } catch {
      confidence = analyzeSignal(topSignal, tokenPrice, klines);
    }

    try {
      await logDecisionOnChain(
        { phase: "analysis", token: topSignal.tokenAddress, confidence, reasoning, price: tokenPrice, chainId: signalChainId },
        1 // ANALYSIS_COMPLETE
      );
    } catch (e) { console.warn(`[demo-agent] On-chain log failed (analysis): ${e}`); }

    emit("agent:analysis", { phase: "complete", confidence, reasoning, token: topSignal.tokenAddress });

    if (confidence < agentConfig.confidenceFloor) {
      emit("agent:analysis", { phase: "skipped", reason: "confidence_below_floor", confidence, floor: agentConfig.confidenceFloor });
      return scheduleCycle();
    }

    // ── Phase 3: Trust Gate (via MCP) ──
    emit("agent:trust-check", { phase: "checking", target: topSignal.address });

    const trustReport = await callMcpTool<TrustScoreResponse>("trust-score", { agentAddress: topSignal.address });

    try {
      await logDecisionOnChain(
        { phase: "trust_check", target: topSignal.address, score: trustReport.overallScore, classification: trustReport.classification },
        2 // TRUST_CHECK
      );
    } catch (e) { console.warn(`[demo-agent] On-chain log failed (trust): ${e}`); }

    emit("agent:trust-check", { phase: "complete", score: trustReport.overallScore, classification: trustReport.classification });

    if (trustReport.overallScore < agentConfig.trustFloor) {
      emit("agent:trust-check", { phase: "rejected", reason: "trust_below_floor", score: trustReport.overallScore });
      return scheduleCycle();
    }

    // ── Phase 4: Execute Swap (X-Layer-first, fallback to signal chain) ──
    const NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const positionOkb = parseFloat(agentConfig.maxPositionSize) || 0.1;
    const swapAmount = BigInt(Math.round(positionOkb * 1e18)).toString();

    // Determine execution chain: try X Layer first, fall back to signal chain
    let executionChainId = signalChainId;
    let xlayerFallback = false;

    if (signalChainId !== X_LAYER) {
      try {
        const xlQuote = await callMcpTool<SwapQuote | null>("dex-quote", {
          chainId: X_LAYER,
          fromToken: NATIVE_TOKEN,
          toToken: topSignal.tokenAddress,
          amount: swapAmount,
        });
        if (parseFloat(xlQuote?.routerResult?.toTokenAmount || "0") > 0) {
          executionChainId = X_LAYER;
          xlayerFallback = true;
        }
      } catch {
        // Token not on X Layer, use signal chain
      }
    }

    emit("agent:swap", {
      phase: "executing", token: topSignal.tokenAddress, action: topSignal.action,
      signalChain: signalChainId, executionChain: executionChainId, xlayerFallback,
    });

    let swapTxHash = "0x" + "0".repeat(64);
    try {
      const quote = await callMcpTool<SwapQuote | null>("dex-quote", {
        chainId: executionChainId,
        fromToken: NATIVE_TOKEN,
        toToken: topSignal.tokenAddress,
        amount: swapAmount,
      });

      const quotedOutput = parseFloat(quote?.routerResult?.toTokenAmount || "0");
      if (quotedOutput <= 0) {
        emit("agent:error", { phase: "swap_rejected", reason: "zero_output_quote" });
        return scheduleCycle();
      }

      const swapData = await callMcpTool<SwapResult | null>("dex-swap", {
        chainId: executionChainId,
        fromToken: NATIVE_TOKEN,
        toToken: topSignal.tokenAddress,
        amount: swapAmount,
        slippage: "1",
        userWalletAddress: getAccount().address,
      });

      if (!swapData?.tx?.to || !swapData?.tx?.data) {
        emit("agent:error", { phase: "swap_rejected", reason: "invalid_swap_response" });
        return scheduleCycle();
      }

      const txValue = BigInt(swapData.tx.value || "0");
      const maxValue = BigInt(swapAmount) * 2n;
      if (txValue > maxValue) {
        emit("agent:error", { phase: "swap_rejected", reason: "tx_value_exceeds_max" });
        return scheduleCycle();
      }

      const clients = getChainClients(executionChainId);
      const hash = await clients.wallet.sendTransaction({
        chain: clients.chain,
        account: getAccount(),
        to: swapData.tx.to as `0x${string}`,
        data: swapData.tx.data as `0x${string}`,
        value: txValue,
      });

      await clients.public.waitForTransactionReceipt({ hash });
      swapTxHash = hash;

      state.positions.push({
        tokenAddress: topSignal.tokenAddress,
        symbol: topSignal.tokenAddress.slice(0, 10),
        entryPrice: tokenPrice?.price ?? "0",
        amount: swapAmount,
        entryTimestamp: Date.now(),
        entryTxHash: hash,
        chainId: executionChainId,
      });

      emit("agent:swap", {
        phase: "complete", txHash: hash, token: topSignal.tokenAddress,
        executionChain: executionChainId, xlayerFallback,
      });
    } catch (err) {
      emit("agent:error", { phase: "swap_failed", error: String(err) });
      // CRIT-2 fix: count failed swaps as losses
      state.consecutiveLosses++;
      try {
        await logDecisionOnChain(
          { phase: "swap_failed", token: topSignal.tokenAddress, error: String(err), confidence },
          6, // EMERGENCY_STOP
        );
      } catch (logErr) { console.warn(`[demo-agent] Failed to log swap failure: ${logErr}`); }
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
          signalChain: signalChainId,
          executionChain: executionChainId,
        },
        3, // SWAP_EXECUTED
        swapTxHash
      );
    } catch (e) { console.warn(`[demo-agent] On-chain log failed (lineage): ${e}`); }

    state.lastDecisionId = lineageId;
    // CRIT-2 fix: reset consecutive losses on successful swap
    state.consecutiveLosses = 0;

    emit("agent:lineage-logged", { phase: "logged", decisionId: lineageId, txHash: swapTxHash });
    emit("agent:cycle-complete", { cycle: state.currentCycle, pnl: state.totalPnl, positions: state.positions.length });

  } catch (err) {
    emit("agent:error", { error: String(err), cycle: state.currentCycle });
  }

  scheduleCycle();
}

// ─── Position Exit Logic (CRIT-3 fix) ──────────────────────────────────────

async function evaluateExistingPositions() {
  if (state.positions.length === 0) return;

  const PROFIT_TARGET = 0.10;  // 10% profit → sell
  const STOP_LOSS = -0.05;     // 5% loss → sell

  const positionsToClose: number[] = [];

  for (let i = 0; i < state.positions.length; i++) {
    const pos = state.positions[i];
    const entryPrice = parseFloat(pos.entryPrice);
    if (entryPrice <= 0) continue;

    try {
      // Fetch current price via MCP using the position's chain
      const currentPriceData = await callMcpTool<PriceInfo | null>("token-price", {
        tokenAddress: pos.tokenAddress,
        chainId: pos.chainId,
      });

      if (!currentPriceData?.price) continue;

      const currentPrice = parseFloat(currentPriceData.price);
      if (currentPrice <= 0) continue;

      const pnlPercent = (currentPrice - entryPrice) / entryPrice;

      if (pnlPercent >= PROFIT_TARGET || pnlPercent <= STOP_LOSS) {
        const reason = pnlPercent >= PROFIT_TARGET ? "profit_target" : "stop_loss";

        emit("agent:swap", {
          phase: "closing_position",
          token: pos.tokenAddress,
          reason,
          pnlPercent: (pnlPercent * 100).toFixed(2) + "%",
          chainId: pos.chainId,
        });

        // Execute sell via MCP
        try {
          const NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
          const swapData = await callMcpTool<SwapResult | null>("dex-swap", {
            chainId: pos.chainId,
            fromToken: pos.tokenAddress,
            toToken: NATIVE_TOKEN,
            amount: pos.amount,
            slippage: "2",
            userWalletAddress: getAccount().address,
          });

          if (swapData?.tx?.to && swapData?.tx?.data) {
            const clients = getChainClients(pos.chainId);
            const hash = await clients.wallet.sendTransaction({
              chain: clients.chain,
              account: getAccount(),
              to: swapData.tx.to as `0x${string}`,
              data: swapData.tx.data as `0x${string}`,
              value: BigInt(swapData.tx.value || "0"),
            });
            await clients.public.waitForTransactionReceipt({ hash });

            // CRIT-2 fix: Update PnL tracking
            const pnlValue = pnlPercent * parseFloat(pos.amount) / 1e18;
            state.totalPnl += pnlValue;

            if (pnlValue < 0) {
              state.consecutiveLosses++;
            } else {
              state.consecutiveLosses = 0;
            }

            try {
              await logDecisionOnChain(
                { phase: "position_closed", token: pos.tokenAddress, pnlPercent, pnlValue, reason, chainId: pos.chainId },
                5 // POSITION_CLOSED
              );
            } catch { /* best effort */ }

            emit("agent:swap", { phase: "position_closed", token: pos.tokenAddress, pnlPercent: (pnlPercent * 100).toFixed(2) + "%", reason });
            positionsToClose.push(i);
          }
        } catch (err) {
          console.warn(`[demo-agent] Failed to close position ${pos.tokenAddress}: ${err}`);
        }
      }
    } catch {
      // Price fetch failed for this position, skip
    }
  }

  // Remove closed positions (reverse order to preserve indices)
  for (let i = positionsToClose.length - 1; i >= 0; i--) {
    state.positions.splice(positionsToClose[i], 1);
  }
}

// ─── Signal Analysis (fallback when LLM unavailable) ───────────────────────

function analyzeSignal(
  signal: SmartMoneyActivity,
  priceInfo: PriceInfo | null,
  klines: KlineData[]
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

  // Ensure agent is registered (lineage contract is on X Layer)
  const xl = xlayerClients();
  const isReg = await xl.public.readContract({
    address: contractAddress,
    abi: LINEAGE_WRITE_ABI,
    functionName: "isRegistered",
    args: [getAccount().address],
  });

  if (!isReg) {
    const hash = await xl.wallet.writeContract({
      chain: xl.chain,
      account: getAccount(),
      address: contractAddress,
      abi: LINEAGE_WRITE_ABI,
      functionName: "registerAgent",
      args: ["Omnispect-X Demo Agent v1"],
    });
    await xl.public.waitForTransactionReceipt({ hash });
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
