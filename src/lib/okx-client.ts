import { createHmac } from "crypto";
import type {
  OKXResponse,
  PortfolioValue,
  TokenBalance,
  SecurityReport,
  SmartMoneyActivity,
  Signal,
  TokenInfo,
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

// ─── Base Request ───────────────────────────────────────────────────────────

async function okxGet<T>(path: string): Promise<T[]> {
  const url = `${config.okx.baseUrl}${path}`;
  const headers = authHeaders("GET", path);

  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`OKX API ${path} failed: ${res.status} ${res.statusText}`);

  const json = (await res.json()) as OKXResponse<T>;
  if (json.code !== "0") throw new Error(`OKX API error: ${json.msg || json.code}`);

  return json.data;
}

// ─── Wallet Portfolio ───────────────────────────────────────────────────────

export async function totalValue(address: string, chains = "196"): Promise<PortfolioValue> {
  const path = `/api/v6/wallet/asset/total-value?address=${address}&chains=${chains}`;
  const data = await okxGet<PortfolioValue>(path);
  return data[0];
}

export async function allBalances(address: string, chains = "196"): Promise<TokenBalance[]> {
  const path = `/api/v6/wallet/asset/all-token-balances-by-address?address=${address}&chains=${chains}`;
  return okxGet<TokenBalance>(path);
}

// ─── Security ───────────────────────────────────────────────────────────────

export async function tokenScan(tokenAddress: string, chainIndex = "196"): Promise<SecurityReport> {
  const path = `/api/v6/wallet/security/token-scan?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<SecurityReport>(path);
  return data[0];
}

// ─── DEX Signal ─────────────────────────────────────────────────────────────

export async function smartMoney(chainIndex = "196", limit = 20): Promise<SmartMoneyActivity[]> {
  const path = `/api/v6/dex/tracker/activities?chainIndex=${chainIndex}&trackerType=smart_money&limit=${limit}`;
  return okxGet<SmartMoneyActivity>(path);
}

export async function signals(chainIndex = "196"): Promise<Signal[]> {
  const path = `/api/v6/dex/tracker/signal/list?chainIndex=${chainIndex}`;
  return okxGet<Signal>(path);
}

// ─── DEX Token ──────────────────────────────────────────────────────────────

export async function tokenInfo(tokenAddress: string, chainIndex = "196"): Promise<TokenInfo> {
  const path = `/api/v6/dex/token/info?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<TokenInfo>(path);
  return data[0];
}

export async function tokenHolders(tokenAddress: string, chainIndex = "196"): Promise<HolderInfo> {
  const path = `/api/v6/dex/token/holders?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<HolderInfo>(path);
  return data[0];
}

export async function tokenLiquidity(tokenAddress: string, chainIndex = "196"): Promise<LiquidityInfo> {
  const path = `/api/v6/dex/token/liquidity?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<LiquidityInfo>(path);
  return data[0];
}

// ─── DEX Market ─────────────────────────────────────────────────────────────

export async function price(tokenAddress: string, chainIndex = "196"): Promise<PriceInfo> {
  const path = `/api/v6/dex/market/price?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}`;
  const data = await okxGet<PriceInfo>(path);
  return data[0];
}

export async function kline(tokenAddress: string, interval = "1H", chainIndex = "196"): Promise<KlineData[]> {
  const path = `/api/v6/dex/market/candles?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}&bar=${interval}`;
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
  const path = `/api/v6/dex/aggregator/quote?${qs}`;
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
  const path = `/api/v6/dex/aggregator/swap?${qs}`;
  const data = await okxGet<SwapResult>(path);
  return data[0];
}

export async function approveTransaction(
  tokenAddress: string,
  amount: string,
  chainIndex = "196"
): Promise<{ data: string; to: string }> {
  const path = `/api/v6/dex/aggregator/approve-transaction?chainIndex=${chainIndex}&tokenContractAddress=${tokenAddress}&approveAmount=${amount}`;
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
  const path = `/api/v6/wallet/pre-transaction/estimate-gas?${qs}`;
  const data = await okxGet<GasEstimate>(path);
  return data[0];
}

export async function broadcastTx(params: {
  chainIndex: string;
  signedTx: string;
}): Promise<{ txHash: string }> {
  const path = `/api/v6/wallet/pre-transaction/broadcast-transaction`;
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
  walletPortfolio: { totalValue, allBalances },
  security: { tokenScan },
  dexSignal: { smartMoney, signals },
  dexToken: { info: tokenInfo, holders: tokenHolders, liquidity: tokenLiquidity },
  dexMarket: { price, kline },
  dexSwap: { quote: swapQuote, swap, approveTransaction },
  onchainGateway: { estimateGas, broadcastTx },
};
