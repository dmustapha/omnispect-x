const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";

export async function fetchTrustScore(address: string) {
  const res = await fetch(`${API_BASE}/api/trust/${address}`);
  if (!res.ok) throw new Error(`Trust score failed: ${res.status}`);
  return res.json();
}

export async function fetchLineage(address: string, offset = 0, limit = 50) {
  const res = await fetch(`${API_BASE}/api/lineage/${address}?offset=${offset}&limit=${limit}`);
  if (!res.ok) throw new Error(`Lineage fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchAgentStats(address: string) {
  const res = await fetch(`${API_BASE}/api/lineage/${address}/stats`);
  if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`);
  return res.json();
}

export async function fetchAgentState() {
  const res = await fetch(`${API_BASE}/api/agent/state`);
  if (!res.ok) throw new Error(`Agent state failed: ${res.status}`);
  return res.json();
}

export async function startAgent() {
  const res = await fetch(`${API_BASE}/api/agent/start`, { method: "POST" });
  if (!res.ok) throw new Error(`Agent start failed: ${res.status}`);
  return res.json();
}

export async function stopAgent() {
  const res = await fetch(`${API_BASE}/api/agent/stop`, { method: "POST" });
  if (!res.ok) throw new Error(`Agent stop failed: ${res.status}`);
  return res.json();
}

export function createWSConnection(onMessage: (data: any) => void): { close: () => void } {
  let ws: WebSocket;
  let closed = false;

  function connect() {
    ws = new WebSocket(WS_BASE);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch { /* ignore parse errors */ }
    };
    ws.onclose = () => {
      if (!closed) setTimeout(connect, 3000);
    };
  }

  connect();
  return { close() { closed = true; ws.close(); } };
}
