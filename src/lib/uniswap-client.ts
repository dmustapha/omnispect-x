import type { UniswapQuote, PoolRiskAssessment } from "../types";
import { config } from "../config";
import { withRetry } from "./retry";
import { X_LAYER_CHAIN_ID } from "./chains";

const UNISWAP_API = "https://trade-api.gateway.uniswap.org";
const NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

// ─── Quote ──────────────────────────────────────────────────────────────────

export async function getQuote(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  chainId?: number;
  swapper?: string;
}): Promise<UniswapQuote> {
  return withRetry(async () => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (config.uniswap.apiKey) headers["x-api-key"] = config.uniswap.apiKey;

    const res = await fetch(`${UNISWAP_API}/v1/quote`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "EXACT_INPUT",
        tokenIn: params.tokenIn,
        tokenInChainId: params.chainId ?? X_LAYER_CHAIN_ID,
        tokenOut: params.tokenOut,
        tokenOutChainId: params.chainId ?? X_LAYER_CHAIN_ID,
        amount: params.amountIn,
        swapper: params.swapper ?? "0x0000000000000000000000000000000000000000",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Uniswap quote failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    return {
      amountOut: json.quote?.amountOut ?? "0",
      gasFee: json.quote?.gasFee ?? "0",
      priceImpact: json.quote?.priceImpact ?? 0,
      routing: json.routing ?? "UNKNOWN",
    };
  });
}

// ─── Pool Risk Assessment ───────────────────────────────────────────────────

export async function getPoolRisk(tokenAddress: string): Promise<PoolRiskAssessment> {
  // Assess pool risk by checking quote quality at different amounts
  // Small amount quote — baseline
  const smallQuote = await getQuote({
    tokenIn: NATIVE_TOKEN,
    tokenOut: tokenAddress,
    amountIn: "100000000000000000", // 0.1 OKB
  });

  // Large amount quote — stress test
  let largeQuote: UniswapQuote;
  try {
    largeQuote = await getQuote({
      tokenIn: NATIVE_TOKEN,
      tokenOut: tokenAddress,
      amountIn: "10000000000000000000", // 10 OKB
    });
  } catch {
    // Pool too thin for large quote — high risk, flagged as fallback
    return {
      tokenAddress,
      liquidityDepth: 0,
      concentrationRatio: 1,
      impliedVolatility: 1,
      riskScore: 10,
      isFallback: true,
    };
  }

  // Price impact comparison = liquidity depth proxy
  const smallImpact = smallQuote.priceImpact;
  const largeImpact = largeQuote.priceImpact;
  const impactRatio = largeImpact > 0 ? largeImpact / Math.max(smallImpact, 0.001) : 1;

  // Lower impact ratio = deeper liquidity = higher score
  const liquidityDepth = impactRatio < 5 ? 80 : impactRatio < 20 ? 50 : 20;
  const concentrationRatio = Math.min(1, impactRatio / 100);
  const impliedVolatility = Math.abs(largeImpact);

  // Composite risk score: 0-100, higher = safer
  const riskScore = Math.max(0, Math.min(100, Math.round(
    liquidityDepth * 0.5 +
    (1 - concentrationRatio) * 30 +
    Math.max(0, 20 - impliedVolatility * 100)
  )));

  return {
    tokenAddress,
    liquidityDepth,
    concentrationRatio,
    impliedVolatility,
    riskScore,
    isFallback: false,
  };
}

// ─── Namespace Export ───────────────────────────────────────────────────────

export const uniswapClient = { getQuote, getPoolRisk };
