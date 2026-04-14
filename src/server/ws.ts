import type { CycleEvent, WSMessage } from "../types";

// ─── Connected Clients ──────────────────────────────────────────────────────

const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket) {
  clients.add(ws);
  ws.addEventListener("close", () => clients.delete(ws));
  ws.addEventListener("error", () => clients.delete(ws));
}

export function broadcast(event: CycleEvent) {
  const message: WSMessage = {
    event: event.type,
    data: event.data,
    timestamp: event.timestamp,
  };
  const json = JSON.stringify(message);

  for (const client of clients) {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      } else {
        clients.delete(client);
      }
    } catch {
      clients.delete(client);
    }
  }
}

export function getClientCount(): number {
  return clients.size;
}
