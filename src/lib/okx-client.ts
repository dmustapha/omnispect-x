import { createHmac } from "crypto";
import type {
  OKXResponse,
  PortfolioValue,
  PortfolioOverview,
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

import { withRetry } from "./retry";

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

export async function totalValue(address: string, chains = MULTI_CHAINS): Promise<PortfolioValue | null> {
  const path = `/api/v5/wallet/asset/total-value-by-address?address=${address}&chains=${chains}`;
  const data = await okxGet<PortfolioValue>(path);
  return data[0] ?? null;
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

// ─── Security ───────────────────────────────────────────────────────────────

export async function tokenScan(tokenAddress: string, chainIndex = "196"): Promise<SecurityReport | null> {
  const path = `/api/v5/wallet/security/token-scan?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<SecurityReport>(path);
  return data[0] ?? null;
}

// ─── DEX Signal (via Token Toplist + Trades) ────────────────────────────────

// Raw shape from /api/v6/dex/market/token/toplist
interface ToplistToken {
  chainIndex: string;
  tokenSymbol: string;
  tokenContractAddress: string;
  volume: string;
  change: string;
  price: string;
  txsBuy: string;
  txsSell: string;
  liquidity: string;
}

export async function smartMoney(chainIndex = "1", limit = 20): Promise<SmartMoneyActivity[]> {
  // Trending tokens by 24h volume — proxy for smart money activity
  const path = `/api/v6/dex/market/token/toplist?chains=${chainIndex}&sortBy=5&timeFrame=4`;
  const tokens = await okxGet<ToplistToken>(path);
  return tokens.slice(0, limit).map((t, i) => ({
    address: `0x${(i + 1).toString(16).padStart(40, "a")}`, // synthetic whale address (toplist doesn't expose trader addresses)
    tokenAddress: t.tokenContractAddress,
    action: parseInt(t.txsBuy || "0") > parseInt(t.txsSell || "0") ? "buy" : "sell",
    amount: t.volume || "0",
    ts: Date.now(),
    price: t.price,
    change: t.change,
    symbol: t.tokenSymbol,
    txsBuy: t.txsBuy,
    txsSell: t.txsSell,
    liquidity: t.liquidity,
  }));
}

// Raw shape from /api/v6/dex/market/trades
interface TradeRecord {
  userAddress: string;
  type: string;
  volume: string;
  price: string;
  tokenContractAddress: string;
  changedTokenInfo: { amount: string; tokenSymbol: string; tokenContractAddress: string }[];
}

export async function signals(chainIndex = "1"): Promise<Signal[]> {
  // Top tokens by price movement as signals
  const path = `/api/v6/dex/market/token/toplist?chains=${chainIndex}&sortBy=2&timeFrame=2`;
  const tokens = await okxGet<ToplistToken>(path);
  return tokens.slice(0, 20).map((t) => ({
    tokenAddress: t.tokenContractAddress,
    signalType: parseFloat(t.change || "0") > 0 ? "bullish" : "bearish",
    strength: Math.min(100, Math.abs(parseFloat(t.change || "0"))),
    chainIndex,
  }));
}

export async function leaderboardList(chainIndex = "1"): Promise<LeaderboardEntry[]> {
  // Top tokens by market cap as a proxy leaderboard
  const path = `/api/v6/dex/market/token/toplist?chains=${chainIndex}&sortBy=6&timeFrame=4`;
  const tokens = await okxGet<ToplistToken>(path);
  return tokens.slice(0, 20).map((t, i) => ({
    address: t.tokenContractAddress,
    pnl: t.change || "0",
    winRate: "0",
    roi: t.change || "0",
    rank: String(i + 1),
  }));
}

// ─── DEX Token ──────────────────────────────────────────────────────────────

export async function tokenInfo(tokenAddress: string, chainIndex = "196"): Promise<TokenInfo | null> {
  const path = `/api/v5/dex/token/info?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<TokenInfo>(path);
  return data[0] ?? null;
}

export async function tokenHolders(tokenAddress: string, chainIndex = "196"): Promise<HolderInfo | null> {
  const path = `/api/v5/dex/token/holders?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<HolderInfo>(path);
  return data[0] ?? null;
}

export async function tokenPriceInfo(tokenAddresses: string[], chainId = "196"): Promise<TokenPriceDetail[]> {
  const path = `/api/v5/dex/token/price-info`;
  return okxPost<TokenPriceDetail>(path, { chainId, tokenAddresses });
}

export async function tokenLiquidity(tokenAddress: string, chainIndex = "196"): Promise<LiquidityInfo | null> {
  const path = `/api/v5/dex/token/liquidity?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<LiquidityInfo>(path);
  return data[0] ?? null;
}

// ─── DEX Market ─────────────────────────────────────────────────────────────

export async function price(tokenAddress: string, chainIndex = "196"): Promise<PriceInfo | null> {
  // v6 /market/price endpoint rejects GET requests; derive price from latest candle instead
  const candles = await kline(tokenAddress, "1H", chainIndex);
  if (!candles.length) return null;
  const latest = candles[0]; // most recent candle
  // Compute 24h change from candle set if enough data (24 x 1H candles)
  let change24h = "0";
  if (candles.length >= 24) {
    const oldClose = parseFloat(candles[23].c);
    const newClose = parseFloat(latest.c);
    if (oldClose > 0) change24h = (((newClose - oldClose) / oldClose) * 100).toFixed(2);
  }
  return {
    price: latest.c,
    change24h,
    volume24h: candles.slice(0, 24).reduce((sum, k) => sum + parseFloat(k.vol || "0"), 0).toString(),
  };
}

export async function kline(tokenAddress: string, interval = "1H", chainIndex = "196"): Promise<KlineData[]> {
  const path = `/api/v6/dex/market/candles?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}&bar=${interval}`;
  // API returns arrays: [ts, open, high, low, close, volume, quoteVolume, confirm]
  const raw = await okxGet<string[]>(path);
  return raw.map((c) => ({
    ts: parseInt(c[0] || "0"),
    o: c[1] || "0",
    h: c[2] || "0",
    l: c[3] || "0",
    c: c[4] || "0",
    vol: c[5] || "0",
  }));
}

// ─── DEX Swap ───────────────────────────────────────────────────────────────

export async function swapQuote(params: SwapQuoteParams): Promise<SwapQuote | null> {
  const qs = new URLSearchParams({
    chainIndex: params.chainIndex,
    fromTokenAddress: params.fromTokenAddress,
    toTokenAddress: params.toTokenAddress,
    amount: params.amount,
    ...(params.slippage && { slippage: params.slippage }),
  }).toString();
  const path = `/api/v5/dex/aggregator/quote?${qs}`;
  const data = await okxGet<SwapQuote>(path);
  return data[0] ?? null;
}

export async function swap(params: SwapParams): Promise<SwapResult | null> {
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
  return data[0] ?? null;
}

export async function approveTransaction(
  tokenAddress: string,
  amount: string,
  chainIndex = "196"
): Promise<{ data: string; to: string } | null> {
  const path = `/api/v5/dex/aggregator/approve-transaction?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}&approveAmount=${amount}`;
  const data = await okxGet<{ data: string; to: string }>(path);
  return data[0] ?? null;
}

// ─── Onchain Gateway ────────────────────────────────────────────────────────

export async function estimateGas(params: {
  chainIndex: string;
  fromAddress: string;
  toAddress: string;
  txAmount: string;
}): Promise<GasEstimate | null> {
  const qs = new URLSearchParams(params).toString();
  const path = `/api/v5/wallet/pre-transaction/estimate-gas?${qs}`;
  const data = await okxGet<GasEstimate>(path);
  return data[0] ?? null;
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
  walletPortfolio: { totalValue, allBalances, portfolioOverview },
  security: { tokenScan },
  dexSignal: { smartMoney, signals, leaderboardList },
  dexToken: { info: tokenInfo, holders: tokenHolders, liquidity: tokenLiquidity, priceInfo: tokenPriceInfo },
  dexMarket: { price, kline },
  dexSwap: { quote: swapQuote, swap, approveTransaction },
  onchainGateway: { estimateGas, broadcastTx },
};
