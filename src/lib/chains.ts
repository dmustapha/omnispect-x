import { defineChain, createWalletClient, createPublicClient, http, type Chain } from "viem";
import { mainnet, bsc } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config";
import type { Hex } from "viem";

// ─── Chain Definitions ──────────────────────────────────────────────────────

export const xlayer = defineChain({
  id: 196,
  name: "X Layer",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: { default: { http: [config.xlayer.rpcUrl] } },
});

export const X_LAYER_CHAIN_ID = 196;

// ─── Supported Chains Registry ──────────────────────────────────────────────

interface ChainEntry {
  chain: Chain;
  rpcUrl?: string; // override viem's default
  nativeSymbol: string;
}

export const SUPPORTED_CHAINS: Record<string, ChainEntry> = {
  "196": { chain: xlayer, rpcUrl: config.xlayer.rpcUrl, nativeSymbol: "OKB" },
  "1":   { chain: mainnet, rpcUrl: config.chains?.ethRpcUrl, nativeSymbol: "ETH" },
  "56":  { chain: bsc, rpcUrl: config.chains?.bscRpcUrl, nativeSymbol: "BNB" },
};

// ─── Multi-Chain Client Factory ─────────────────────────────────────────────

interface ChainClients {
  chain: Chain;
  wallet: ReturnType<typeof createWalletClient>;
  public: ReturnType<typeof createPublicClient>;
}

const clientCache = new Map<string, ChainClients>();

function getAccount() {
  if (!config.agentWallet.privateKey) throw new Error("PRIVATE_KEY env var is required");
  return privateKeyToAccount(config.agentWallet.privateKey as Hex);
}

export function getChainClients(chainId: string): ChainClients {
  const cached = clientCache.get(chainId);
  if (cached) return cached;

  const entry = SUPPORTED_CHAINS[chainId];
  if (!entry) throw new Error(`Unsupported chain: ${chainId}. Supported: ${Object.keys(SUPPORTED_CHAINS).join(", ")}`);

  const account = getAccount();
  const transport = http(entry.rpcUrl); // undefined rpcUrl → viem uses chain's default

  const clients: ChainClients = {
    chain: entry.chain,
    wallet: createWalletClient({ account, chain: entry.chain, transport }),
    public: createPublicClient({ chain: entry.chain, transport }),
  };

  clientCache.set(chainId, clients);
  return clients;
}

export function getAgentAccount() {
  return getAccount();
}
