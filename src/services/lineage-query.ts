import { createPublicClient, http, getContract, type Abi } from "viem";
import { config } from "../config";
import { xlayer } from "../lib/chains";
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

// ─── LRU Cache (IPFS — immutable, no TTL needed) ────────────────────────────

const ipfsCache = new Map<string, ReasoningPayload>();
const MAX_IPFS_CACHE = 500;

function ipfsCacheGet(key: string): ReasoningPayload | undefined {
  const value = ipfsCache.get(key);
  if (value !== undefined) {
    // Move to end (most recently used)
    ipfsCache.delete(key);
    ipfsCache.set(key, value);
  }
  return value;
}

function ipfsCacheSet(key: string, value: ReasoningPayload) {
  if (ipfsCache.size >= MAX_IPFS_CACHE) {
    const firstKey = ipfsCache.keys().next().value;
    if (firstKey) ipfsCache.delete(firstKey);
  }
  ipfsCache.set(key, value);
}

// ─── LRU Cache (Decision Chains — TTL 60s) ──────────────────────────────────

const chainCache = new Map<string, { data: DecisionNode[]; ts: number }>();
const MAX_CHAIN_CACHE = 100;
const CHAIN_CACHE_TTL = 60_000;

function chainCacheGet(key: string): DecisionNode[] | undefined {
  const entry = chainCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CHAIN_CACHE_TTL) {
    chainCache.delete(key);
    return undefined;
  }
  chainCache.delete(key);
  chainCache.set(key, entry);
  return entry.data;
}

function chainCacheSet(key: string, data: DecisionNode[]) {
  if (chainCache.size >= MAX_CHAIN_CACHE) {
    const firstKey = chainCache.keys().next().value;
    if (firstKey) chainCache.delete(firstKey);
  }
  chainCache.set(key, { data, ts: Date.now() });
}

// ─── IPFS Fetcher ───────────────────────────────────────────────────────────

export async function getReasoningText(ipfsUri: string): Promise<ReasoningPayload> {
  const cached = ipfsCacheGet(ipfsUri);
  if (cached) return cached;

  const cid = ipfsUri.replace("ipfs://", "");
  const url = `${config.ipfs.gateway}/ipfs/${cid}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`);

  const payload = (await res.json()) as ReasoningPayload;
  ipfsCacheSet(ipfsUri, payload);
  return payload;
}

// ─── Contract Readers ───────────────────────────────────────────────────────

interface RawDecisionTuple {
  agent: string;
  decisionId: string;
  prevDecisionId: string;
  reasoningHash: string;
  reasoningURI: string;
  actionType: number | bigint;
  resultTxHash: string;
  timestamp: number | bigint;
  blockNumber: number | bigint;
}

function mapDecision(raw: RawDecisionTuple): DecisionNode {
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
  const cacheKey = `${agentAddress}:${offset}:${limit}`;
  const cached = chainCacheGet(cacheKey);
  if (cached) return cached;

  const contract = getLineageContract();
  const raw = await contract.read.getAgentDecisionChain([
    agentAddress as `0x${string}`,
    BigInt(offset),
    BigInt(limit),
  ]);

  const decisions = (raw as RawDecisionTuple[]).map(mapDecision);

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

  const result = enriched
    .filter(r => r.status === "fulfilled")
    .map(r => (r as PromiseFulfilledResult<DecisionNode>).value);

  chainCacheSet(cacheKey, result);
  return result;
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
