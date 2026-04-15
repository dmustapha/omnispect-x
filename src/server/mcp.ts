import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createWalletClient, createPublicClient, http, keccak256, toBytes, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { scoreTrust } from "../services/trust-scorer";
import { lineageQuery } from "../services/lineage-query";
import { generateReasoning } from "../services/llm-reasoning";
import { okxClient } from "../lib/okx-client";
import { xlayer } from "../lib/chains";
import { config } from "../config";

// ─── Contract ABI ──────────────────────────────────────────────────────────

const LINEAGE_ABI = [
  {
    name: "registerAgent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "metadata", type: "string" }],
    outputs: [],
  },
  {
    name: "logDecision",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "decisionId", type: "bytes32" },
      { name: "reasoningHash", type: "bytes32" },
      { name: "reasoningURI", type: "string" },
      { name: "actionType", type: "uint8" },
      { name: "resultTxHash", type: "bytes32" },
    ],
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

// ─── Shared Tool Registration ──────────────────────────────────────────────

export function registerAllTools(server: McpServer) {

  // ── trust-score ──
  server.registerTool(
    "trust-score",
    {
      title: "Trust Score",
      description: "Analyze the trust score of any agent wallet address. Returns a 0-100 score with 4-axis breakdown, classification (SAFE/CAUTION/BLOCKLIST), and recommendations.",
      inputSchema: {
        agentAddress: z.string().describe("The 0x wallet address of the agent to score"),
        chainId: z.number().optional().describe("Chain ID (default: 196 for X Layer)"),
      },
    },
    async ({ agentAddress, chainId }) => {
      try {
        const result = await scoreTrust({ agentAddress, chainId });
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error scoring ${agentAddress}: ${String(err)}` }], isError: true };
      }
    }
  );

  // ── lineage-query ──
  server.registerTool(
    "lineage-query",
    {
      title: "Lineage Query",
      description: "Query the decision lineage chain for an agent. Returns linked decisions with reasoning, action types, and transaction hashes.",
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
        return { content: [{ type: "text" as const, text: JSON.stringify({ stats, decisions: chain }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error querying lineage: ${String(err)}` }], isError: true };
      }
    }
  );

  // ── lineage-log (FIXED: real IPFS pin + contract write) ──
  server.registerTool(
    "lineage-log",
    {
      title: "Lineage Log",
      description: "Log a new decision to the on-chain lineage registry via IPFS pin + smart contract write. Records the agent's decision with reasoning for auditability.",
      inputSchema: {
        reasoning: z.string().describe("The reasoning text for this decision"),
        actionType: z.number().describe("Action type: 0=SIGNAL, 1=ANALYSIS, 2=TRUST_CHECK, 3=SWAP, 4=OPEN, 5=CLOSE, 6=EMERGENCY"),
        resultTxHash: z.string().optional().describe("The transaction hash of the resulting action"),
        metadata: z.record(z.string(), z.unknown()).optional().describe("Additional metadata to pin with reasoning"),
      },
    },
    async ({ reasoning, actionType, resultTxHash, metadata }) => {
      try {
        // Validate actionType range (LOW-6 fix)
        if (actionType < 0 || actionType > 6) {
          return { content: [{ type: "text" as const, text: "Error: actionType must be 0-6" }], isError: true };
        }

        if (!config.agentWallet.privateKey) {
          return { content: [{ type: "text" as const, text: "Error: PRIVATE_KEY env var is required." }], isError: true };
        }
        if (!config.xlayer.lineageLoggerAddress) {
          return { content: [{ type: "text" as const, text: "Error: LINEAGE_CONTRACT env var is required." }], isError: true };
        }

        // Pin reasoning to IPFS
        const payload = { reasoning, actionType, timestamp: Date.now(), ...metadata };
        const pinRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.ipfs.pinataJwt}`,
          },
          body: JSON.stringify({ pinataContent: payload }),
        });
        if (!pinRes.ok) throw new Error(`Pinata pin failed: ${pinRes.status}`);
        const pinJson = await pinRes.json() as { IpfsHash: string };
        const reasoningURI = `ipfs://${pinJson.IpfsHash}`;

        // Write to contract
        const account = privateKeyToAccount(config.agentWallet.privateKey as Hex);
        const publicClient = createPublicClient({ chain: xlayer, transport: http(config.xlayer.rpcUrl) });
        const walletClient = createWalletClient({ account, chain: xlayer, transport: http(config.xlayer.rpcUrl) });
        const contractAddress = config.xlayer.lineageLoggerAddress as `0x${string}`;

        const reasoningHash = keccak256(toBytes(JSON.stringify(payload)));
        const decisionId = keccak256(toBytes(`${Date.now()}-${actionType}-${Math.random().toString(36)}`));

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: LINEAGE_ABI,
          functionName: "logDecision",
          args: [
            decisionId as Hex,
            reasoningHash as Hex,
            reasoningURI,
            actionType,
            (resultTxHash || "0x" + "0".repeat(64)) as Hex,
          ],
        });

        await publicClient.waitForTransactionReceipt({ hash });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ decisionId, reasoningURI, txHash: hash, cid: pinJson.IpfsHash }, null, 2),
          }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error logging decision: ${String(err)}` }], isError: true };
      }
    }
  );

  // ── agent-register ──
  server.registerTool(
    "agent-register",
    {
      title: "Agent Register",
      description: "Register an AI agent on the DecisionLineageLogger contract on X Layer. Once registered, the agent can log decisions on-chain.",
      inputSchema: {
        metadata: z.string().describe("Agent description/metadata string"),
      },
    },
    async ({ metadata }) => {
      try {
        if (!config.agentWallet.privateKey) {
          return { content: [{ type: "text" as const, text: "Error: PRIVATE_KEY env var is required." }], isError: true };
        }
        if (!config.xlayer.lineageLoggerAddress) {
          return { content: [{ type: "text" as const, text: "Error: LINEAGE_CONTRACT env var is required." }], isError: true };
        }

        const account = privateKeyToAccount(config.agentWallet.privateKey as Hex);
        const publicClient = createPublicClient({ chain: xlayer, transport: http(config.xlayer.rpcUrl) });
        const walletClient = createWalletClient({ account, chain: xlayer, transport: http(config.xlayer.rpcUrl) });
        const contractAddress = config.xlayer.lineageLoggerAddress as `0x${string}`;

        const isReg = await publicClient.readContract({
          address: contractAddress,
          abi: LINEAGE_ABI,
          functionName: "isRegistered",
          args: [account.address],
        });

        if (isReg) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ status: "already_registered", address: account.address }, null, 2) }] };
        }

        const hash = await walletClient.writeContract({
          address: contractAddress,
          abi: LINEAGE_ABI,
          functionName: "registerAgent",
          args: [metadata],
        });
        await publicClient.waitForTransactionReceipt({ hash });

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ status: "registered", address: account.address, txHash: hash, metadata }, null, 2) }],
        };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error registering agent: ${String(err)}` }], isError: true };
      }
    }
  );

  // ── smart-money-signals (NEW) ──
  server.registerTool(
    "smart-money-signals",
    {
      title: "Smart Money Signals",
      description: "Get real-time smart money whale activity and signals from OKX DEX. Returns whale buys/sells with amounts and token addresses.",
      inputSchema: {
        chainId: z.string().optional().describe("Chain ID (default: '1' for Ethereum)"),
        limit: z.number().optional().describe("Max signals to return (default: 20)"),
      },
    },
    async ({ chainId, limit }) => {
      try {
        const data = await okxClient.dexSignal.smartMoney(chainId ?? "1", limit ?? 20);
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error fetching signals: ${String(err)}` }], isError: true };
      }
    }
  );

  // ── token-price (NEW) ──
  server.registerTool(
    "token-price",
    {
      title: "Token Price",
      description: "Get the current price, 24h change, and volume for a token on a specific chain.",
      inputSchema: {
        tokenAddress: z.string().describe("Token contract address"),
        chainId: z.string().optional().describe("Chain ID (default: '196' for X Layer)"),
      },
    },
    async ({ tokenAddress, chainId }) => {
      try {
        const data = await okxClient.dexMarket.price(tokenAddress, chainId ?? "196");
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error fetching price: ${String(err)}` }], isError: true };
      }
    }
  );

  // ── token-klines (NEW) ──
  server.registerTool(
    "token-klines",
    {
      title: "Token Klines",
      description: "Get candlestick/kline data for a token. Returns OHLCV data for technical analysis.",
      inputSchema: {
        tokenAddress: z.string().describe("Token contract address"),
        bar: z.string().optional().describe("Interval: 1m, 5m, 15m, 1H, 4H, 1D (default: '1H')"),
        chainId: z.string().optional().describe("Chain ID (default: '196')"),
      },
    },
    async ({ tokenAddress, bar, chainId }) => {
      try {
        const data = await okxClient.dexMarket.kline(tokenAddress, bar ?? "1H", chainId ?? "196");
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error fetching klines: ${String(err)}` }], isError: true };
      }
    }
  );

  // ── dex-quote (NEW) ──
  server.registerTool(
    "dex-quote",
    {
      title: "DEX Quote",
      description: "Get a swap quote from OKX DEX aggregator. Returns expected output amount, gas estimate, and routing info.",
      inputSchema: {
        chainId: z.string().describe("Chain ID for the swap"),
        fromToken: z.string().describe("Source token address (use 0xeee...eee for native token)"),
        toToken: z.string().describe("Destination token address"),
        amount: z.string().describe("Amount in smallest unit (wei)"),
      },
    },
    async ({ chainId, fromToken, toToken, amount }) => {
      try {
        const data = await okxClient.dexSwap.quote({
          chainIndex: chainId,
          fromTokenAddress: fromToken,
          toTokenAddress: toToken,
          amount,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error fetching quote: ${String(err)}` }], isError: true };
      }
    }
  );

  // ── dex-swap (NEW) ──
  server.registerTool(
    "dex-swap",
    {
      title: "DEX Swap",
      description: "Execute a token swap via OKX DEX aggregator. Returns unsigned transaction data for signing.",
      inputSchema: {
        chainId: z.string().describe("Chain ID for the swap"),
        fromToken: z.string().describe("Source token address"),
        toToken: z.string().describe("Destination token address"),
        amount: z.string().describe("Amount in smallest unit (wei)"),
        slippage: z.string().optional().describe("Slippage percent (default: '1' = 1%)"),
        userWalletAddress: z.string().describe("Wallet address executing the swap"),
      },
    },
    async ({ chainId, fromToken, toToken, amount, slippage, userWalletAddress }) => {
      try {
        const data = await okxClient.dexSwap.swap({
          chainIndex: chainId,
          fromTokenAddress: fromToken,
          toTokenAddress: toToken,
          amount,
          slippage: slippage ?? "0.01",
          userWalletAddress,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error executing swap: ${String(err)}` }], isError: true };
      }
    }
  );

  // ── llm-analyze (NEW) ──
  server.registerTool(
    "llm-analyze",
    {
      title: "LLM Analysis",
      description: "Use Claude to analyze a trading signal with market data. Returns a confidence score (0-1) and reasoning.",
      inputSchema: {
        tokenAddress: z.string().describe("Token being analyzed"),
        whaleAddress: z.string().describe("Whale address that triggered the signal"),
        action: z.string().describe("Signal action: 'buy' or 'sell'"),
        amount: z.string().describe("Signal amount in USD"),
        price: z.string().optional().describe("Current token price"),
        change24h: z.string().optional().describe("24h price change percentage"),
        klines: z.array(z.object({ vol: z.string(), c: z.string() })).optional().describe("Recent kline data"),
      },
    },
    async ({ tokenAddress, whaleAddress, action, amount, price, change24h, klines }) => {
      try {
        const result = await generateReasoning({
          signal: { address: whaleAddress, tokenAddress, action, amount },
          priceInfo: price ? { price, change24h: change24h ?? "0" } : null,
          klines: klines ?? [],
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error in LLM analysis: ${String(err)}` }], isError: true };
      }
    }
  );

  // ── token-security (NEW) ──
  server.registerTool(
    "token-security",
    {
      title: "Token Security Scan",
      description: "Scan a token for security risks: honeypot detection, buy/sell tax analysis, risk level assessment.",
      inputSchema: {
        tokenAddress: z.string().describe("Token contract address to scan"),
        chainId: z.string().optional().describe("Chain ID (default: '196')"),
      },
    },
    async ({ tokenAddress, chainId }) => {
      try {
        const data = await okxClient.security.tokenScan(tokenAddress, chainId ?? "196");
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error scanning token: ${String(err)}` }], isError: true };
      }
    }
  );
}

// ─── Stdio Server (for CLI usage) ──────────────────────────────────────────

export async function startMcpServer() {
  const server = new McpServer({ name: "omnispect-x", version: "1.0.0" });
  registerAllTools(server);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("MCP server started on stdio");
}

// Run standalone if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer().catch(console.error);
}
