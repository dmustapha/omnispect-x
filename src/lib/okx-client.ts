import { createHmac } from "crypto";
import type {
  OKXResponse,
  PortfolioValue,
  PortfolioOverview,
  TransactionRecord,
  TokenBalance,
  SecurityReport,
  SmartMoneyActivity,
  Signal,
  LeaderboardEntry,
  TokenInfo,
  TokenPriceDetail,
  HolderInfo,
  LiquidityInfo,
  PriceInfo,
  KlineData,
  SwapQuoteParams,
  SwapQuote,
  SwapParams,
  SwapResult,
  GasEstimate,
} from "../types";
import { config } from "../config";

// ─── HMAC Auth ──────────────────────────────────────────────────────────────

function sign(timestamp: string, method: string, path: string, body: string = ""): string {
  const prehash = timestamp + method.toUpperCase() + path + body;
  return createHmac("sha256", config.okx.secretKey).update(prehash).digest("base64");
}

function authHeaders(method: string, path: string, body?: string): Record<string, string> {
  const timestamp = new Date().toISOString();
  return {
    "OK-ACCESS-KEY": config.okx.apiKey,
    "OK-ACCESS-SIGN": sign(timestamp, method, path, body),
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": config.okx.passphrase,
    "Content-Type": "application/json",
  };
}

// ─── Retry Helper ───────────────────────────────────────────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelay = 500): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
  throw new Error("unreachable");
}

// ─── Base Request ───────────────────────────────────────────────────────────

async function okxGet<T>(path: string): Promise<T[]> {
  return withRetry(async () => {
    const url = `${config.okx.baseUrl}${path}`;
    const headers = authHeaders("GET", path);

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`OKX API ${path.split("?")[0]} failed: ${res.status}`);

    const json = (await res.json()) as OKXResponse<T>;
    if (json.code !== "0") throw new Error(`OKX API error: ${json.msg || json.code}`);

    return json.data;
  });
}

async function okxPost<T>(path: string, body: Record<string, unknown>): Promise<T[]> {
  return withRetry(async () => {
    const bodyStr = JSON.stringify(body);
    const url = `${config.okx.baseUrl}${path}`;
    const headers = authHeaders("POST", path, bodyStr);

    const res = await fetch(url, { method: "POST", headers, body: bodyStr });
    if (!res.ok) throw new Error(`OKX API POST ${path.split("?")[0]} failed: ${res.status}`);

    const json = (await res.json()) as OKXResponse<T>;
    if (json.code !== "0") throw new Error(`OKX API error: ${json.msg || json.code}`);

    return json.data;
  });
}

// ─── Wallet Portfolio ───────────────────────────────────────────────────────

const MULTI_CHAINS = "1,56,137,42161,196";

export async function totalValue(address: string, chains = MULTI_CHAINS): Promise<PortfolioValue> {
  const path = `/api/v5/wallet/asset/total-value-by-address?address=${address}&chains=${chains}`;
  const data = await okxGet<PortfolioValue>(path);
  return data[0];
}

export async function allBalances(address: string, chains = MULTI_CHAINS): Promise<TokenBalance[]> {
  const path = `/api/v5/wallet/asset/all-token-balances-by-address?address=${address}&chains=${chains}`;
  const data = await okxGet<{ tokenAssets: TokenBalance[] }>(path);
  // Response nests tokens under data[0].tokenAssets
  return data[0]?.tokenAssets ?? [];
}

export async function portfolioOverview(address: string): Promise<PortfolioOverview | null> {
  try {
    const path = `/api/v5/wallet/asset/portfolio-overview?address=${address}`;
    const data = await okxGet<PortfolioOverview>(path);
    return data[0] ?? null;
  } catch { return null; }
}

export async function transactionsByAddress(address: string, chains = MULTI_CHAINS, _limit = 50): Promise<TransactionRecord[]> {
  // OKX doesn't expose a public tx-history endpoint via web3 API
  // We derive transaction info from balance data instead
  return [];
}

// ─── Security ───────────────────────────────────────────────────────────────

export async function tokenScan(tokenAddress: string, chainIndex = "196"): Promise<SecurityReport> {
  const path = `/api/v5/wallet/security/token-scan?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<SecurityReport>(path);
  return data[0];
}

// ─── DEX Signal ─────────────────────────────────────────────────────────────

export async function smartMoney(chainIndex = "1", limit = 20): Promise<SmartMoneyActivity[]> {
  try {
    const path = `/api/v5/dex/tracker/activities?chainIndex=${chainIndex}&trackerType=smart_money&limit=${limit}`;
    return await okxGet<SmartMoneyActivity>(path);
  } catch { return []; }
}

export async function signals(chainIndex = "1"): Promise<Signal[]> {
  try {
    const path = `/api/v5/dex/tracker/signal/list?chainIndex=${chainIndex}`;
    return await okxGet<Signal>(path);
  } catch { return []; }
}

export async function leaderboardList(chainIndex = "1"): Promise<LeaderboardEntry[]> {
  try {
    const path = `/api/v5/dex/tracker/leaderboard/list?chainIndex=${chainIndex}`;
    return await okxGet<LeaderboardEntry>(path);
  } catch { return []; }
}

// ─── DEX Token ──────────────────────────────────────────────────────────────

export async function tokenInfo(tokenAddress: string, chainIndex = "196"): Promise<TokenInfo> {
  const path = `/api/v5/dex/token/info?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<TokenInfo>(path);
  return data[0];
}

export async function tokenHolders(tokenAddress: string, chainIndex = "196"): Promise<HolderInfo> {
  const path = `/api/v5/dex/token/holders?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<HolderInfo>(path);
  return data[0];
}

export async function tokenPriceInfo(tokenAddresses: string[], chainId = "196"): Promise<TokenPriceDetail[]> {
  try {
    const path = `/api/v5/dex/token/price-info`;
    return await okxPost<TokenPriceDetail>(path, { chainId, tokenAddresses });
  } catch { return []; }
}

export async function tokenLiquidity(tokenAddress: string, chainIndex = "196"): Promise<LiquidityInfo> {
  const path = `/api/v5/dex/token/liquidity?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<LiquidityInfo>(path);
  return data[0];
}

// ─── DEX Market ─────────────────────────────────────────────────────────────

export async function price(tokenAddress: string, chainIndex = "196"): Promise<PriceInfo> {
  const path = `/api/v5/dex/market/price?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<PriceInfo>(path);
  return data[0];
}

export async function kline(tokenAddress: string, interval = "1H", chainIndex = "196"): Promise<KlineData[]> {
  const path = `/api/v5/dex/market/candles?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}&bar=${interval}`;
  return okxGet<KlineData>(path);
}

// ─── DEX Swap ───────────────────────────────────────────────────────────────

export async function swapQuote(params: SwapQuoteParams): Promise<SwapQuote> {
  const qs = new URLSearchParams({
    chainIndex: params.chainIndex,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    amount: params.amount,
    ...(params.slippage && { slippage: params.slippage }),
  }).toString();
  const path = `/api/v5/dex/aggregator/quote?${qs}`;
  const data = await okxGet<SwapQuote>(path);
  return data[0];
}

export async function swap(params: SwapParams): Promise<SwapResult> {
  const qs = new URLSearchParams({
    chainIndex: params.chainIndex,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    amount: params.amount,
    slippage: params.slippage || "0.01",
    userWalletAddress: params.userWalletAddress,
  }).toString();
  const path = `/api/v5/dex/aggregator/swap?${qs}`;
  const data = await okxGet<SwapResult>(path);
  return data[0];
}

export async function approveTransaction(
  tokenAddress: string,
  amount: string,
  chainIndex = "196"
): Promise<{ data: string; to: string }> {
  const path = `/api/v5/dex/aggregator/approve-transaction?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}&approveAmount=${amount}`;
  const data = await okxGet<{ data: string; to: string }>(path);
  return data[0];
}

// ─── Onchain Gateway ────────────────────────────────────────────────────────

export async function estimateGas(params: {
  chainIndex: string;
  fromAddress: string;
  toAddress: string;
  txAmount: string;
}): Promise<GasEstimate> {
  const qs = new URLSearchParams(params).toString();
  const path = `/api/v5/wallet/pre-transaction/estimate-gas?${qs}`;
  const data = await okxGet<GasEstimate>(path);
  return data[0];
}

export async function broadcastTx(params: {
  chainIndex: string;
  signedTx: string;
}): Promise<{ txHash: string }> {
  const path = `/api/v5/wallet/pre-transaction/broadcast-transaction`;
  const body = JSON.stringify({ chainIndex: params.chainIndex, signedTx: params.signedTx });
  const url = `${config.okx.baseUrl}${path}`;
  const headers = authHeaders("POST", path, body);
  const res = await fetch(url, { method: "POST", headers, body });
  if (!res.ok) throw new Error(`OKX broadcast failed: ${res.status}`);
  const json = (await res.json()) as OKXResponse<{ txHash: string }>;
  if (json.code !== "0") throw new Error(`OKX broadcast error: ${json.msg}`);
  return json.data[0];
}

// ─── Namespace Export ───────────────────────────────────────────────────────

export const okxClient = {
  walletPortfolio: { totalValue, allBalances, portfolioOverview, transactionsByAddress },
  security: { tokenScan },
  dexSignal: { smartMoney, signals, leaderboardList },
  dexToken: { info: tokenInfo, holders: tokenHolders, liquidity: tokenLiquidity, priceInfo: tokenPriceInfo },
  dexMarket: { price, kline },
  dexSwap: { quote: swapQuote, swap, approveTransaction },
  onchainGateway: { estimateGas, broadcastTx },
};
