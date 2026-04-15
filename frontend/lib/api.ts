const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

async function fetchWithTimeout(url: string, opts: RequestInit = {}, ms = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(id);
  }
}

export async function fetchTrustScore(address: string) {
  return fetchWithTimeout(`${API_BASE}/api/trust/${address}`);
}

export async function fetchLineage(address: string, offset = 0, limit = 50) {
  return fetchWithTimeout(`${API_BASE}/api/lineage/${address}?offset=${offset}&limit=${limit}`);
}

export async function fetchAgentStats(address: string) {
  return fetchWithTimeout(`${API_BASE}/api/lineage/${address}/stats`);
}

export async function fetchAgentState() {
  return fetchWithTimeout(`${API_BASE}/api/agent/state`);
}

export async function startAgent() {
  return fetchWithTimeout(`${API_BASE}/api/agent/start`, { method: "POST" });
}

export async function stopAgent() {
  return fetchWithTimeout(`${API_BASE}/api/agent/stop`, { method: "POST" });
}

export function createWSConnection(
  onMessage: (data: any) => void,
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
        const data = JSON.parse(event.data);
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
