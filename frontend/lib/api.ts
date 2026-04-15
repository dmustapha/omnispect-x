import type { TrustScoreData } from "../components/TrustScoreCard";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

async function fetchWithTimeout<T>(url: string, opts: RequestInit = {}, ms = 15000): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(id);
  }
}

export async function fetchTrustScore(address: string): Promise<TrustScoreData> {
  return fetchWithTimeout<TrustScoreData>(`${API_BASE}/api/trust/${address}`);
}

interface LineageResponse {
  decisions: Array<{
    agent: string;
    decisionId: string;
    prevDecisionId: string;
    reasoningHash: string;
    reasoningURI: string;
    actionType: number;
    resultTxHash: string;
    timestamp: number;
    blockNumber: number;
    reasoningText?: string;
    signals?: unknown[];
    confidence?: number;
  }>;
  count: number;
}

export async function fetchLineage(address: string, offset = 0, limit = 50): Promise<LineageResponse> {
  return fetchWithTimeout<LineageResponse>(`${API_BASE}/api/lineage/${address}?offset=${offset}&limit=${limit}`);
}

interface AgentStatsResponse {
  address: string;
  totalDecisions: number;
  firstDecisionTimestamp: number;
  lastDecisionTimestamp: number;
  actionTypeCounts: Record<string, number>;
  isRegistered: boolean;
}

export async function fetchAgentStats(address: string): Promise<AgentStatsResponse> {
  return fetchWithTimeout<AgentStatsResponse>(`${API_BASE}/api/lineage/${address}/stats`);
}

interface AgentStateResponse {
  running: boolean;
  currentCycle: number;
  totalPnl: number;
  consecutiveLosses: number;
  lastDecisionId: string | null;
}

export async function fetchAgentState(): Promise<AgentStateResponse> {
  return fetchWithTimeout<AgentStateResponse>(`${API_BASE}/api/agent/state`);
}

export async function startAgent(): Promise<{ status: string; state: AgentStateResponse }> {
  return fetchWithTimeout<{ status: string; state: AgentStateResponse }>(`${API_BASE}/api/agent/start`, { method: "POST" });
}

export async function stopAgent(): Promise<{ status: string; state: AgentStateResponse }> {
  return fetchWithTimeout<{ status: string; state: AgentStateResponse }>(`${API_BASE}/api/agent/stop`, { method: "POST" });
}

interface WSEvent {
  event: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export function createWSConnection(
  onMessage: (data: WSEvent) => void,
  onError?: (err: Event) => void,
  onOpen?: () => void
): { close: () => void } {
  let ws: WebSocket;
  let closed = false;
  let delay = 3000;

  function connect() {
    ws = new WebSocket(WS_BASE);
    ws.onopen = () => { delay = 3000; onOpen?.(); };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WSEvent;
        onMessage(data);
      } catch { /* ignore parse errors */ }
    };
    ws.onerror = (err) => { onError?.(err); };
    ws.onclose = () => {
      onError?.(new Event("close"));
      if (!closed) {
        setTimeout(connect, delay);
        delay = Math.min(delay * 2, 30000);
      }
    };
  }

  connect();
  return { close() { closed = true; ws.close(); } };
}
