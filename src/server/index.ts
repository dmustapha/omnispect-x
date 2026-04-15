import { Hono } from "hono";
import { cors } from "hono/cors";
import { scoreTrust } from "../services/trust-scorer";
import { lineageQuery } from "../services/lineage-query";
import { demoAgent } from "../services/demo-agent";
import { x402Gate } from "../middleware/x402";
import { addClient, removeClient, getClientCount } from "./ws";
import { registerAllTools } from "./mcp";
import { config } from "../config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Context, Next } from "hono";
import type { TrustScoreRequest } from "../types";

// ─── Startup Validation ────────────────────────────────────────────────────
if (!config.xlayer.lineageLoggerAddress) {
  console.warn("[config] LINEAGE_CONTRACT not set — on-chain logging will fail. Set it in .env");
}
if (!config.okx.apiKey) {
  console.warn("[config] OKX_API_KEY not set — API calls will fail. Set it in .env");
}
if (!config.agentSecret) {
  console.warn("[config] AGENT_SECRET not set — agent control routes are unprotected. Set it in .env for production.");
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

// ─── Rate Limiter ────────────────────────────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // requests per window
const RATE_WINDOW = 60_000; // 1 minute

// Cleanup expired entries every 5 minutes to prevent memory leak (HIGH-1)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 5 * 60_000);

function rateLimit() {
  return async (c: Context, next: Next) => {
    // Parse first IP from x-forwarded-for header (MED-9)
    const forwarded = c.req.header("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0].trim() : null) || c.req.header("x-real-ip") || "unknown";
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    } else {
      entry.count++;
      if (entry.count >= RATE_LIMIT) {
        return c.json({ error: "Rate limit exceeded. Try again later." }, 429);
      }
    }

    await next();
  };
}

// ─── Agent Auth ──────────────────────────────────────────────────────────────

function agentAuth() {
  return async (c: Context, next: Next) => {
    // If AGENT_SECRET is set, require it for agent control routes
    if (config.agentSecret) {
      const token = c.req.header("x-agent-secret");
      if (token !== config.agentSecret) {
        return c.json({ error: "Unauthorized — invalid or missing agent secret" }, 401);
      }
    }
    await next();
  };
}

// ─── Middleware ──────────────────────────────────────────────────────────────

const allowedOrigins = config.corsOrigin.split(",").map(o => o.trim());
app.use("*", cors({
  origin: (origin) => allowedOrigins.includes(origin) ? origin : null,
}));
app.use("/api/*", rateLimit());

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
    console.error("[trust-score]", err);
    return c.json({ error: "Trust score computation failed" }, 500);
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
    return c.json({
      ...result,
      premium: true,
      detailedFindings: result.dimensions,
      uniswapDeepDive: result.uniswapRisk,
    });
  } catch (err) {
    console.error("[trust-score-premium]", err);
    return c.json({ error: "Trust score computation failed" }, 500);
  }
});

// ─── Lineage Routes ─────────────────────────────────────────────────────────

app.get("/api/lineage/decision/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const decision = await lineageQuery.getDecision(id);
    return c.json(decision);
  } catch (err) {
    console.error("[lineage-decision]", err);
    return c.json({ error: "Failed to fetch decision" }, 500);
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
    console.error("[lineage-stats]", err);
    return c.json({ error: "Failed to fetch agent stats" }, 500);
  }
});

app.get("/api/lineage/:address", async (c) => {
  const address = c.req.param("address");
  const badAddr = validateAddress(c, address);
  if (badAddr) return badAddr;
  const rawOffset = Number(c.req.query("offset") || "0");
  const rawLimit = Number(c.req.query("limit") || "50");
  const offset = Number.isFinite(rawOffset) && rawOffset >= 0 ? Math.floor(rawOffset) : 0;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), 100) : 50;
  try {
    const chain = await lineageQuery.getDecisionChain(address, offset, limit);
    return c.json({ decisions: chain, count: chain.length });
  } catch (err) {
    console.error("[lineage-chain]", err);
    return c.json({ error: "Failed to fetch lineage chain" }, 500);
  }
});

// ─── Agent Control Routes ───────────────────────────────────────────────────

app.use("/api/agent/*", agentAuth());

app.post("/api/agent/start", async (c) => {
  try {
    await demoAgent.start();
    return c.json({ status: "started", state: demoAgent.getState() });
  } catch (err) {
    console.error("[agent-start]", err);
    return c.json({ error: "Failed to start agent" }, 500);
  }
});

app.post("/api/agent/stop", (c) => {
  demoAgent.stop();
  return c.json({ status: "stopped", state: demoAgent.getState() });
});

app.get("/api/agent/state", (c) => {
  return c.json(demoAgent.getState());
});

// ─── MCP HTTP Transport ─────────────────────────────────────────────────────

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

type McpSession = { server: McpServer; transport: WebStandardStreamableHTTPServerTransport; createdAt: number };
const mcpSessions = new Map<string, McpSession>();
const MAX_MCP_SESSIONS = 100;
const MCP_SESSION_TTL = 30 * 60_000; // 30 minutes

// Cleanup stale MCP sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of mcpSessions) {
    if (now - session.createdAt > MCP_SESSION_TTL) {
      session.transport.close().catch(() => {});
      mcpSessions.delete(id);
    }
  }
}, 5 * 60_000);

app.all("/mcp", async (c) => {
  try {
    const sessionId = c.req.header("mcp-session-id");

    // Route to existing session
    if (sessionId && mcpSessions.has(sessionId)) {
      return await mcpSessions.get(sessionId)!.transport.handleRequest(c.req.raw);
    }

    // Only POST can create new sessions (initialize)
    if (c.req.method !== "POST") {
      if (c.req.method === "DELETE") return c.json({ error: "Session not found" }, 404);
      return c.json({ error: "Invalid or missing session" }, 400);
    }

    // Reject new sessions if at capacity
    if (mcpSessions.size >= MAX_MCP_SESSIONS) {
      return c.json({ error: "Too many active sessions" }, 503);
    }

    // Create new stateful session — onsessioninitialized fires after initialize handshake
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (newId: string) => {
        mcpSessions.set(newId, { server: mcpServer, transport, createdAt: Date.now() });
      },
    });
    transport.onclose = () => {
      if (transport.sessionId) mcpSessions.delete(transport.sessionId);
    };
    const mcpServer = new McpServer({ name: "omnispect-x", version: "1.0.0" });
    registerAllTools(mcpServer);
    await mcpServer.connect(transport);

    return await transport.handleRequest(c.req.raw);
  } catch (err) {
    console.error("[mcp-http]", err);
    return c.json({ error: "MCP transport error" }, 500);
  }
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
