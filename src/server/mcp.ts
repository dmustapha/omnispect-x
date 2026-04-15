import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createWalletClient, createPublicClient, http, defineChain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { scoreTrust } from "../services/trust-scorer";
import { lineageQuery } from "../services/lineage-query";
import { config } from "../config";

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

// ─── Tool: agent-register ─────────────────────────────────────────────────

const REGISTER_ABI = [
  {
    name: "registerAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "metadata", type: "string" }],
    outputs: [],
  },
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

const mcpXlayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [config.xlayer.rpcUrl] } },
});

server.registerTool(
  "agent-register",
  {
    title: "Agent Register",
    description: "Register an AI agent on the Omnispect-X Decision Lineage contract on X Layer. Once registered, the agent can log decisions on-chain. Returns the transaction hash.",
    inputSchema: {
      metadata: z.string().describe("Agent description/metadata string (e.g. 'My Trading Agent v1')"),
    },
  },
  async ({ metadata }) => {
    try {
      if (!config.agentWallet.privateKey) {
        return {
          content: [{ type: "text" as const, text: "Error: PRIVATE_KEY env var is required to register an agent." }],
          isError: true,
        };
      }
      if (!config.xlayer.lineageLoggerAddress) {
        return {
          content: [{ type: "text" as const, text: "Error: LINEAGE_CONTRACT env var is required." }],
          isError: true,
        };
      }

      const account = privateKeyToAccount(config.agentWallet.privateKey as Hex);
      const publicClient = createPublicClient({ chain: mcpXlayer, transport: http(config.xlayer.rpcUrl) });
      const walletClient = createWalletClient({ account, chain: mcpXlayer, transport: http(config.xlayer.rpcUrl) });
      const contractAddress = config.xlayer.lineageLoggerAddress as `0x${string}`;

      const isReg = await publicClient.readContract({
        address: contractAddress,
        abi: REGISTER_ABI,
        functionName: "isRegistered",
        args: [account.address],
      });

      if (isReg) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ status: "already_registered", address: account.address }, null, 2) }],
        };
      }

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: REGISTER_ABI,
        functionName: "registerAgent",
        args: [metadata],
      });

      await publicClient.waitForTransactionReceipt({ hash });

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ status: "registered", address: account.address, txHash: hash, metadata }, null, 2),
        }],
      };
    } catch (err) {
      return {
        content: [{ type: "text" as const, text: `Error registering agent: ${String(err)}` }],
        isError: true,
      };
    }
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
