import { Hono } from "hono";
import { cors } from "hono/cors";
import { scoreTrust } from "../services/trust-scorer";
import { lineageQuery } from "../services/lineage-query";
import { demoAgent } from "../services/demo-agent";
import { x402Gate } from "../middleware/x402";
import { addClient, getClientCount } from "./ws";
import { config } from "../config";
import type { TrustScoreRequest } from "../types";

const app = new Hono();

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use("*", cors({ origin: "*" }));

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/health", (c) =>
  c.json({ status: "ok", wsClients: getClientCount(), agent: demoAgent.getState().running })
);

// ─── Trust Score Routes ─────────────────────────────────────────────────────

app.get("/api/trust/:address", async (c) => {
  const address = c.req.param("address");
  const chainId = Number(c.req.query("chainId") || "196");
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
  const chainId = Number(c.req.query("chainId") || "196");
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

app.get("/api/lineage/:address", async (c) => {
  const address = c.req.param("address");
  const offset = Number(c.req.query("offset") || "0");
  const limit = Number(c.req.query("limit") || "50");
  try {
    const chain = await lineageQuery.getDecisionChain(address, offset, limit);
    return c.json({ decisions: chain, count: chain.length });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/api/lineage/:address/stats", async (c) => {
  const address = c.req.param("address");
  try {
    const stats = await lineageQuery.getAgentStats(address);
    return c.json(stats);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/api/lineage/decision/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const decision = await lineageQuery.getDecision(id);
    return c.json(decision);
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
  idleTimeout: 60,
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
    open(ws) {
      addClient(ws as unknown as WebSocket);
    },
    message() { /* client messages not needed */ },
    close() { /* handled by addClient listener */ },
  },
});

console.log(`Omnispect-X backend running on http://localhost:${server.port}`);
console.log(`WebSocket available at ws://localhost:${server.port}/ws`);
