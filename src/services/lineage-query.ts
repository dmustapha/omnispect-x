import { createPublicClient, http, getContract, defineChain, type Abi } from "viem";
import { config } from "../config";
import type { DecisionNode, ReasoningPayload, AgentStats, ActionType } from "../types";

// ─── Contract ABI (subset for reads) ───────────────────────────────────────

const LINEAGE_ABI = [
  {
    name: "getDecision",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "decisionId", type: "bytes32" }],
    outputs: [{
      name: "",
      type: "tuple",
      components: [
        { name: "agent", type: "address" },
        { name: "decisionId", type: "bytes32" },
        { name: "prevDecisionId", type: "bytes32" },
        { name: "reasoningHash", type: "bytes32" },
        { name: "reasoningURI", type: "string" },
        { name: "actionType", type: "uint8" },
        { name: "resultTxHash", type: "bytes32" },
        { name: "timestamp", type: "uint64" },
        { name: "blockNumber", type: "uint64" },
      ],
    }],
  },
  {
    name: "getAgentDecisionChain",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "agent", type: "address" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{
      name: "",
      type: "tuple[]",
      components: [
        { name: "agent", type: "address" },
        { name: "decisionId", type: "bytes32" },
        { name: "prevDecisionId", type: "bytes32" },
        { name: "reasoningHash", type: "bytes32" },
        { name: "reasoningURI", type: "string" },
        { name: "actionType", type: "uint8" },
        { name: "resultTxHash", type: "bytes32" },
        { name: "timestamp", type: "uint64" },
        { name: "blockNumber", type: "uint64" },
      ],
    }],
  },
  {
    name: "getAgentDecisionCount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const satisfies Abi;

// ─── Client Setup ───────────────────────────────────────────────────────────

const xlayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [config.xlayer.rpcUrl] } },
});

const client = createPublicClient({
  chain: xlayer,
  transport: http(config.xlayer.rpcUrl),
});

function getLineageContract() {
  return getContract({
    address: config.xlayer.lineageLoggerAddress as `0x${string}`,
    abi: LINEAGE_ABI,
    client,
  });
}

// ─── LRU Cache ──────────────────────────────────────────────────────────────

const ipfsCache = new Map<string, ReasoningPayload>();
const MAX_CACHE = 500;

function cacheSet(key: string, value: ReasoningPayload) {
  if (ipfsCache.size >= MAX_CACHE) {
    const firstKey = ipfsCache.keys().next().value;
    if (firstKey) ipfsCache.delete(firstKey);
  }
  ipfsCache.set(key, value);
}

// ─── IPFS Fetcher ───────────────────────────────────────────────────────────

export async function getReasoningText(ipfsUri: string): Promise<ReasoningPayload> {
  if (ipfsCache.has(ipfsUri)) return ipfsCache.get(ipfsUri)!;

  const cid = ipfsUri.replace("ipfs://", "");
  const url = `${config.ipfs.gateway}/ipfs/${cid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);

  const payload = (await res.json()) as ReasoningPayload;
  cacheSet(ipfsUri, payload);
  return payload;
}

// ─── Contract Readers ───────────────────────────────────────────────────────

function mapDecision(raw: any): DecisionNode {
  return {
    agent: raw.agent,
    decisionId: raw.decisionId,
    prevDecisionId: raw.prevDecisionId,
    reasoningHash: raw.reasoningHash,
    reasoningURI: raw.reasoningURI,
    actionType: Number(raw.actionType) as ActionType,
    resultTxHash: raw.resultTxHash,
    timestamp: Number(raw.timestamp),
    blockNumber: Number(raw.blockNumber),
  };
}

export async function getDecisionChain(
  agentAddress: string,
  offset = 0,
  limit = 50
): Promise<DecisionNode[]> {
  const contract = getLineageContract();
  const raw = await contract.read.getAgentDecisionChain([
    agentAddress as `0x${string}`,
    BigInt(offset),
    BigInt(limit),
  ]);

  const decisions = (raw as any[]).map(mapDecision);

  // Enrich with IPFS reasoning (parallel, best-effort)
  const enriched = await Promise.allSettled(
    decisions.map(async (d) => {
      if (!d.reasoningURI) return d;
      try {
        const payload = await getReasoningText(d.reasoningURI);
        return { ...d, reasoningText: payload.reasoning, signals: payload.signals, confidence: payload.confidence };
      } catch {
        return d;
      }
    })
  );

  return enriched.map(r => r.status === "fulfilled" ? r.value : (r as any).reason);
}

export async function getDecision(decisionId: string): Promise<DecisionNode> {
  const contract = getLineageContract();
  const raw = await contract.read.getDecision([decisionId as `0x${string}`]);
  const decision = mapDecision(raw);

  if (decision.reasoningURI) {
    try {
      const payload = await getReasoningText(decision.reasoningURI);
      return { ...decision, reasoningText: payload.reasoning, signals: payload.signals, confidence: payload.confidence };
    } catch { /* return unenriched */ }
  }

  return decision;
}

export async function getAgentStats(agentAddress: string): Promise<AgentStats> {
  const contract = getLineageContract();
  const addr = agentAddress as `0x${string}`;

  const [count, isReg] = await Promise.all([
    contract.read.getAgentDecisionCount([addr]),
    contract.read.isRegistered([addr]),
  ]);

  const totalDecisions = Number(count);

  let firstTs = 0;
  let lastTs = 0;
  const actionTypeCounts: Record<number, number> = {};

  if (totalDecisions > 0) {
    const [first] = await getDecisionChain(agentAddress, 0, 1);
    const [last] = await getDecisionChain(agentAddress, totalDecisions - 1, 1);
    firstTs = first?.timestamp ?? 0;
    lastTs = last?.timestamp ?? 0;

    const sample = await getDecisionChain(agentAddress, 0, Math.min(totalDecisions, 100));
    for (const d of sample) {
      actionTypeCounts[d.actionType] = (actionTypeCounts[d.actionType] || 0) + 1;
    }
  }

  return {
    address: agentAddress,
    totalDecisions,
    firstDecisionTimestamp: firstTs,
    lastDecisionTimestamp: lastTs,
    actionTypeCounts: actionTypeCounts as Record<ActionType, number>,
    isRegistered: isReg as boolean,
  };
}

export const lineageQuery = { getDecisionChain, getDecision, getReasoningText, getAgentStats };
