import type { AppConfig } from "./types";

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3001", 10),
  okx: {
    apiKey: process.env.OKX_API_KEY || "",
    secretKey: process.env.OKX_SECRET_KEY || "",
    passphrase: process.env.OKX_PASSPHRASE || "",
    baseUrl: process.env.OKX_BASE_URL || "https://web3.okx.com",
  },
  xlayer: {
    rpcUrl: process.env.X_LAYER_RPC || "https://rpc.xlayer.tech",
    chainId: 196,
    lineageLoggerAddress: process.env.LINEAGE_CONTRACT || "",
  },
  uniswap: {
    tradingApiUrl: "https://trade-api.gateway.uniswap.org",
    swapRouter02: "0x4f0c28f5926afda16bf2506d5d9e57ea190f9bca",
    apiKey: process.env.UNISWAP_API_KEY || "",
  },
  ipfs: {
    pinataJwt: process.env.PINATA_JWT || "",
    gateway: process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud",
  },
  agentWallet: {
    privateKey: process.env.PRIVATE_KEY || "",
  },
  agentSecret: process.env.AGENT_SECRET || "",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000,https://omnispect-x.vercel.app",
  x402: {
    paymentTokenAddress: "0x4ae46a509f6b1d9056937ba4500cb143933d2dc8", // USDG
    pricePerReport: "10000000000000000", // 0.01 USDG (18 decimals)
    facilitatorUrl: "https://web3.okx.com/api/v6/x402",
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    model: process.env.LLM_MODEL || "claude-haiku-4-5-20251001",
  },
};
