import { Hono } from "hono";
import { cors } from "hono/cors";
import { scoreTrust } from "../services/trust-scorer";
import { lineageQuery } from "../services/lineage-query";
import { demoAgent } from "../services/demo-agent";
import { x402Gate } from "../middleware/x402";
import { addClient, removeClient, getClientCount } from "./ws";
import { config } from "../config";
import type { Context } from "hono";
import type { TrustScoreRequest } from "../types";

// ─── Startup Validation ────────────────────────────────────────────────────
if (!config.xlayer.lineageLoggerAddress) {
  console.warn("[config] LINEAGE_CONTRACT not set — on-chain logging will fail. Set it in .env");
}
if (!config.okx.apiKey) {
  console.warn("[config] OKX_API_KEY not set — API calls will fail. Set it in .env");
}

const app = new Hono();

// ─── Validation ──────────────────────────────────────────────────────────────

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function validateAddress(c: Context, address: string) {
  if (!ADDRESS_RE.test(address)) {
    return c.json({ error: "Invalid address — must be 0x followed by 40 hex chars" }, 400);
  }
  return null;
}

function validateChainId(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use("*", cors({ origin: config.corsOrigin }));

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/health", (c) =>
  c.json({ status: "ok", wsClients: getClientCount(), agent: demoAgent.getState().running })
);

// ─── Trust Score Routes ─────────────────────────────────────────────────────

app.get("/api/trust/:address", async (c) => {
  const address = c.req.param("address");
  const badAddr = validateAddress(c, address);
  if (badAddr) return badAddr;
  const chainId = validateChainId(c.req.query("chainId") || "196");
  if (!chainId) return c.json({ error: "Invalid chainId" }, 400);
  try {
    const result = await scoreTrust({ agentAddress: address, chainId });
    return c.json(result);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// Premium trust report (x402 gated)
app.get("/api/trust/:address/premium", x402Gate(), async (c) => {
  const address = c.req.param("address");
  const badAddr = validateAddress(c, address);
  if (badAddr) return badAddr;
  const chainId = validateChainId(c.req.query("chainId") || "196");
  if (!chainId) return c.json({ error: "Invalid chainId" }, 400);
  try {
    const result = await scoreTrust({ agentAddress: address, chainId });
    // Premium report includes extra data
    return c.json({
      ...result,
      premium: true,
      detailedFindings: result.dimensions,
      uniswapDeepDive: result.uniswapRisk,
    });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Lineage Routes ─────────────────────────────────────────────────────────

app.get("/api/lineage/decision/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const decision = await lineageQuery.getDecision(id);
    return c.json(decision);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/api/lineage/:address/stats", async (c) => {
  const address = c.req.param("address");
  const badAddr = validateAddress(c, address);
  if (badAddr) return badAddr;
  try {
    const stats = await lineageQuery.getAgentStats(address);
    return c.json(stats);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/api/lineage/:address", async (c) => {
  const address = c.req.param("address");
  const badAddr = validateAddress(c, address);
  if (badAddr) return badAddr;
  const offset = Number(c.req.query("offset") || "0");
  const limit = Math.min(Number(c.req.query("limit") || "50"), 100);
  try {
    const chain = await lineageQuery.getDecisionChain(address, offset, limit);
    return c.json({ decisions: chain, count: chain.length });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── Agent Control Routes ───────────────────────────────────────────────────

app.post("/api/agent/start", async (c) => {
  try {
    await demoAgent.start();
    return c.json({ status: "started", state: demoAgent.getState() });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.post("/api/agent/stop", (c) => {
  demoAgent.stop();
  return c.json({ status: "stopped", state: demoAgent.getState() });
});

app.get("/api/agent/state", (c) => {
  return c.json(demoAgent.getState());
});

// ─── WebSocket Upgrade ──────────────────────────────────────────────────────

// Bun-native WebSocket upgrade
const server = Bun.serve({
  port: config.port,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const success = server.upgrade(req);
      if (success) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    return app.fetch(req);
  },
  websocket: {
    idleTimeout: 60,
    open(ws) {
      addClient(ws as unknown as WebSocket);
    },
    message() { /* client messages not needed */ },
    close(ws) {
      removeClient(ws as unknown as WebSocket);
    },
  },
});

console.log(`Omnispect-X backend running on http://localhost:${server.port}`);
console.log(`WebSocket available at ws://localhost:${server.port}/ws`);
