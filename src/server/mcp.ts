import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { scoreTrust } from "../services/trust-scorer";
import { lineageQuery } from "../services/lineage-query";

const server = new McpServer({
  name: "omnispect-x",
  version: "1.0.0",
});

// ─── Tool: trust-score ──────────────────────────────────────────────────────

server.registerTool(
  "trust-score",
  {
    title: "Trust Score",
    description: "Analyze the trust score of any agent wallet address on X Layer. Returns a 0-100 score with 4-axis breakdown, classification (SAFE/CAUTION/BLOCKLIST), and recommendations.",
    inputSchema: {
      agentAddress: z.string().describe("The 0x wallet address of the agent to score"),
      chainId: z.number().optional().describe("Chain ID (default: 196 for X Layer)"),
    },
  },
  async ({ agentAddress, chainId }) => {
    try {
      const result = await scoreTrust({ agentAddress, chainId });
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text" as const,
          text: `Error scoring ${agentAddress}: ${String(err)}`,
        }],
        isError: true,
      };
    }
  }
);

// ─── Tool: lineage-query ────────────────────────────────────────────────────

server.registerTool(
  "lineage-query",
  {
    title: "Lineage Query",
    description: "Query the decision lineage chain for an agent. Returns a linked list of decisions with reasoning, action types, and transaction hashes.",
    inputSchema: {
      agentAddress: z.string().describe("The 0x wallet address of the agent"),
      offset: z.number().optional().describe("Pagination offset (default: 0)"),
      limit: z.number().optional().describe("Max decisions to return (default: 20)"),
    },
  },
  async ({ agentAddress, offset, limit }) => {
    try {
      const chain = await lineageQuery.getDecisionChain(agentAddress, offset ?? 0, limit ?? 20);
      const stats = await lineageQuery.getAgentStats(agentAddress);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ stats, decisions: chain }, null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{
          type: "text" as const,
          text: `Error querying lineage for ${agentAddress}: ${String(err)}`,
        }],
        isError: true,
      };
    }
  }
);

// ─── Tool: lineage-log ─────────────────────────────────────────────────────

server.registerTool(
  "lineage-log",
  {
    title: "Lineage Log",
    description: "Log a new decision to the on-chain lineage registry. For agent developers who want to record their agent's decisions.",
    inputSchema: {
      reasoning: z.string().describe("The reasoning text for this decision"),
      actionType: z.number().describe("Action type: 0=SIGNAL, 1=ANALYSIS, 2=TRUST_CHECK, 3=SWAP, 4=OPEN, 5=CLOSE, 6=EMERGENCY"),
      resultTxHash: z.string().optional().describe("The transaction hash of the resulting action, if any"),
    },
  },
  async ({ reasoning, actionType, resultTxHash }) => {
    return {
      content: [{
        type: "text" as const,
        text: "lineage-log requires a wallet connection. Use the Omnispect-X API at POST /api/lineage/log with a signed transaction instead.",
      }],
    };
  }
);

// ─── Start ──────────────────────────────────────────────────────────────────

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP server started on stdio");
}

// Run standalone if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer().catch(console.error);
}
