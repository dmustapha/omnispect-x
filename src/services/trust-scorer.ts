import { okxClient } from "../lib/okx-client";
import { uniswapClient } from "../lib/uniswap-client";
import { lineageQuery } from "./lineage-query";
import type {
  TrustScoreRequest,
  TrustScoreResponse,
  Finding,
  DimensionScore,
  UniswapRiskAssessment,
  AgentProfile,
  TokenBalance,
  SecurityReport,
  PoolRiskAssessment,
  PortfolioOverview,
} from "../types";

const CHAIN_NAMES: Record<string, string> = {
  "1": "Ethereum",
  "56": "BSC",
  "137": "Polygon",
  "42161": "Arbitrum",
  "196": "X Layer",
};

// Known blue-chip tokens (lowercase addresses on ETH mainnet)
const BLUE_CHIPS = new Set([
  "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
  "0x514910771af9ca656af840dff83e8264ecf986ca", // LINK
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984", // UNI
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", // AAVE
  "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2", // MKR
]);

const NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

// ─── Main Entry Point ───────────────────────────────────────────────────

export async function scoreTrust(req: TrustScoreRequest): Promise<TrustScoreResponse> {
  const { agentAddress } = req;
  const startMs = Date.now();

  // Fetch balance data (the richest data source available)
  const [portfolioResult, balancesResult] = await Promise.allSettled([
    okxClient.walletPortfolio.totalValue(agentAddress),
    okxClient.walletPortfolio.allBalances(agentAddress),
  ]);

  const balanceList = balancesResult.status === "fulfilled" ? balancesResult.value : [];

  // Filter out obvious spam/dust tokens: tokens with zero balance or zero price
  const meaningfulTokens = balanceList.filter(b => {
    const bal = parseFloat(b.balance || "0");
    const price = parseFloat(b.tokenPrice || "0");
    return bal > 0 && price > 0;
  });

  // Compute real portfolio value ourselves (more accurate than API total which includes spam)
  const tokenValues = meaningfulTokens.map(b => ({
    ...b,
    usdValue: parseFloat(b.balance) * parseFloat(b.tokenPrice || "0"),
  }));
  tokenValues.sort((a, b) => b.usdValue - a.usdValue);

  const computedTotalValue = tokenValues.reduce((sum, t) => sum + t.usdValue, 0);

  // Chain distribution
  const chainMap = new Map<string, { count: number; value: number }>();
  for (const t of tokenValues) {
    const chain = t.chainIndex || "unknown";
    const existing = chainMap.get(chain) || { count: 0, value: 0 };
    existing.count++;
    existing.value += t.usdValue;
    chainMap.set(chain, existing);
  }

  // Risk token analysis
  const riskTokens = meaningfulTokens.filter(b => b.isRiskToken);
  const riskTokenValue = riskTokens.reduce(
    (s, b) => s + parseFloat(b.balance) * parseFloat(b.tokenPrice || "0"),
    0
  );

  // Blue-chip analysis
  const blueChipTokens = tokenValues.filter(t =>
    BLUE_CHIPS.has(t.tokenAddress?.toLowerCase()) ||
    t.tokenAddress?.toLowerCase() === NATIVE_TOKEN
  );
  const blueChipValue = blueChipTokens.reduce((s, t) => s + t.usdValue, 0);

  // ── Deep analysis: tokenScan, uniswap risk, portfolio overview (parallel, best-effort) ──
  const topTokenAddresses = tokenValues
    .filter(t => t.tokenAddress?.toLowerCase() !== NATIVE_TOKEN)
    .slice(0, 5)
    .map(t => ({ address: t.tokenAddress, chainIndex: t.chainIndex || "196" }));

  const [scanResults, poolResults, overviewResult, agentStatsResult] = await Promise.all([
    // Token security scans (top 5 non-native tokens)
    Promise.allSettled(
      topTokenAddresses.map(t =>
        okxClient.security.tokenScan(t.address, t.chainIndex)
      )
    ),
    // Uniswap pool risk (top 3 non-native tokens)
    Promise.allSettled(
      topTokenAddresses.slice(0, 3).map(t =>
        uniswapClient.getPoolRisk(t.address)
      )
    ),
    // Portfolio overview (PnL, win rate, trade count)
    okxClient.walletPortfolio.portfolioOverview(agentAddress).catch(() => null),
    // On-chain agent detection via DecisionLineageLogger
    lineageQuery.getAgentStats(agentAddress).catch(() => null),
  ]);

  const securityScans: SecurityReport[] = scanResults
    .filter(r => r.status === "fulfilled")
    .map(r => (r as PromiseFulfilledResult<SecurityReport>).value)
    .filter(Boolean);

  const poolRisks: PoolRiskAssessment[] = poolResults
    .filter(r => r.status === "fulfilled")
    .map(r => (r as PromiseFulfilledResult<PoolRiskAssessment>).value)
    .filter(Boolean);

  const overview: PortfolioOverview | null = overviewResult;

  // Agent profile (differentiates agentic wallets from regular ones)
  const agentProfile: AgentProfile = agentStatsResult
    ? {
        isAgent: agentStatsResult.isRegistered || agentStatsResult.totalDecisions > 0,
        totalDecisions: agentStatsResult.totalDecisions,
        registeredOnChain: agentStatsResult.isRegistered,
      }
    : { isAgent: false, totalDecisions: 0, registeredOnChain: false };

  // Compute uniswap risk summary
  const uniswapRisk: UniswapRiskAssessment = poolRisks.length > 0
    ? {
        poolsAnalyzed: poolRisks.length,
        avgLiquidityScore: Math.round(poolRisks.reduce((s, p) => s + p.riskScore, 0) / poolRisks.length),
        concentrationRisk: Math.round(Math.max(...poolRisks.map(p => p.concentrationRatio)) * 100),
      }
    : { poolsAnalyzed: 0, avgLiquidityScore: 0, concentrationRisk: 0 };

  // Score each dimension (now with deep data)
  const tp = scoreTransactionPatterns(tokenValues, computedTotalValue, chainMap, balanceList.length);
  const ci = scoreContractInteractions(riskTokens, meaningfulTokens, blueChipTokens, blueChipValue, computedTotalValue, securityScans);
  const ff = scoreFundFlow(tokenValues, computedTotalValue, chainMap, riskTokenValue, poolRisks);
  const bc = scoreBehavioralConsistency(tokenValues, computedTotalValue, chainMap, blueChipValue, overview);

  const rawSum = tp.score + ci.score + ff.score + bc.score;
  const overallScore = Math.max(0, Math.min(100, rawSum));

  // Classification
  const allFindings = [...tp.findings, ...ci.findings, ...ff.findings, ...bc.findings];
  const hasCritical = allFindings.some(f => f.severity === "CRITICAL");
  const hasHigh = allFindings.some(f => f.severity === "HIGH");

  let classification: "SAFE" | "CAUTION" | "BLOCKLIST";
  if (hasCritical || overallScore < 40) classification = "BLOCKLIST";
  else if (hasHigh || overallScore < 70) classification = "CAUTION";
  else classification = "SAFE";

  const recommendations = generateRecommendations(classification, tp, ci, ff, bc, agentProfile);
  const queryDurationMs = Date.now() - startMs;
  const activeChains = Array.from(chainMap.keys()).map(c => CHAIN_NAMES[c] || `Chain ${c}`);

  return {
    address: agentAddress,
    overallScore,
    classification,
    dimensions: {
      transactionPatterns: tp,
      contractInteractions: ci,
      fundFlow: ff,
      behavioralConsistency: bc,
    },
    uniswapRisk,
    agentProfile,
    recommendations,
    metadata: {
      chainsQueried: activeChains.length > 0 ? activeChains : Object.values(CHAIN_NAMES),
      totalDataPoints: balanceList.length + securityScans.length + poolRisks.length,
      queryDurationMs,
      freshness: `${Math.round(queryDurationMs / 1000)}s ago`,
    },
    timestamp: Date.now(),
  };
}

// ─── Axis 1: Transaction Patterns (0-25) ─────────────────────────────────

interface TokenWithValue extends TokenBalance {
  usdValue: number;
}

function scoreTransactionPatterns(
  tokens: TokenWithValue[],
  totalValue: number,
  chainMap: Map<string, { count: number; value: number }>,
  rawTokenCount: number,
): DimensionScore {
  let score = 3;
  const findings: Finding[] = [];
  const rawMetrics: Record<string, number | string> = {};

  // Portfolio value
  rawMetrics.portfolioValueUsd = formatUsd(totalValue);

  if (totalValue > 100000) { score += 7; }
  else if (totalValue > 10000) { score += 5; }
  else if (totalValue > 1000) { score += 3; }
  else if (totalValue > 10) { score += 1; }
  else {
    findings.push({ category: "portfolio", description: "Very low portfolio value", severity: "MEDIUM", evidence: `Total value: ${formatUsd(totalValue)}` });
  }

  // Token diversity (meaningful tokens only)
  const tokenCount = tokens.length;
  rawMetrics.meaningfulTokens = tokenCount;
  rawMetrics.totalTokensIncludingDust = rawTokenCount;

  if (tokenCount > 50) { score += 5; }
  else if (tokenCount > 20) { score += 4; }
  else if (tokenCount > 10) { score += 3; }
  else if (tokenCount > 3) { score += 1; }
  else {
    findings.push({ category: "diversity", description: `Only ${tokenCount} valuable token(s)`, severity: "LOW", evidence: `${tokenCount} tokens with non-zero value` });
  }

  // Chain spread — multi-chain activity
  const activeChains = chainMap.size;
  rawMetrics.activeChains = activeChains;

  if (activeChains >= 4) { score += 5; }
  else if (activeChains >= 3) { score += 3; }
  else if (activeChains >= 2) { score += 2; }
  else {
    findings.push({ category: "chains", description: `Only active on ${activeChains} chain(s)`, severity: "LOW", evidence: `Chains: ${Array.from(chainMap.keys()).map(c => CHAIN_NAMES[c] || c).join(", ")}` });
  }

  // Native token holdings (ETH, BNB, MATIC, etc.) — sign of real usage
  const nativeHoldings = tokens.filter(t => t.tokenAddress?.toLowerCase() === NATIVE_TOKEN);
  rawMetrics.nativeTokenChains = nativeHoldings.length;
  if (nativeHoldings.length >= 3) { score += 3; }
  else if (nativeHoldings.length >= 1) { score += 1; }

  // Airdrop/spam indicator: if raw token count >> meaningful tokens
  const spamRatio = rawTokenCount > 0 ? (rawTokenCount - tokenCount) / rawTokenCount : 0;
  rawMetrics.spamTokenRatio = `${(spamRatio * 100).toFixed(0)}%`;

  return {
    score: clamp(score),
    findings,
    evidence: {
      dataPoints: rawTokenCount,
      sources: compact([
        `OKX Portfolio (${activeChains} chains)`,
        rawTokenCount > 100 ? "Multi-chain balance scan" : null,
      ]),
      rawMetrics,
    },
  };
}

// ─── Axis 2: Contract Interactions (0-25) ────────────────────────────────

function scoreContractInteractions(
  riskTokens: TokenBalance[],
  allTokens: TokenBalance[],
  blueChips: TokenWithValue[],
  blueChipValue: number,
  totalValue: number,
  securityScans: SecurityReport[] = [],
): DimensionScore {
  let score = 5;
  const findings: Finding[] = [];
  const rawMetrics: Record<string, number | string> = {};

  // ── Deep security scan results (tokenScan API) ──
  rawMetrics.tokensScanned = securityScans.length;

  if (securityScans.length > 0) {
    const honeypots = securityScans.filter(s => s.isHoneypot);
    const highRisk = securityScans.filter(s => s.riskLevel === "high");
    const medRisk = securityScans.filter(s => s.riskLevel === "medium");
    const highTax = securityScans.filter(s => parseFloat(s.buyTax || "0") > 10 || parseFloat(s.sellTax || "0") > 10);

    rawMetrics.honeypots = honeypots.length;
    rawMetrics.highRiskTokens = highRisk.length;

    if (honeypots.length > 0) {
      score -= 10;
      findings.push({ category: "honeypot", description: `${honeypots.length} honeypot token(s) detected`, severity: "CRITICAL", evidence: `OKX tokenScan flagged ${honeypots.length} tokens as honeypots` });
    }

    if (highTax.length > 0) {
      score -= 3;
      findings.push({ category: "highTax", description: `${highTax.length} token(s) with >10% buy/sell tax`, severity: "HIGH", evidence: `Abnormal token taxes detected via OKX security scan` });
    }

    if (highRisk.length > 0) {
      score -= 3;
      findings.push({ category: "riskLevel", description: `${highRisk.length} high-risk token(s)`, severity: "HIGH", evidence: `OKX security scan rated ${highRisk.length} tokens as high risk` });
    } else if (medRisk.length > 0) {
      score -= 1;
      findings.push({ category: "riskLevel", description: `${medRisk.length} medium-risk token(s)`, severity: "MEDIUM", evidence: `OKX security scan rated ${medRisk.length} tokens as medium risk` });
    }

    // All scans clean bonus
    if (honeypots.length === 0 && highRisk.length === 0 && highTax.length === 0) {
      score += 3;
      findings.push({ category: "security", description: "All scanned tokens passed security checks", severity: "LOW", evidence: `${securityScans.length} tokens passed OKX tokenScan` });
    }
  }

  // Risk token exposure (from portfolio balance flags)
  rawMetrics.riskTokenCount = riskTokens.length;
  rawMetrics.totalTokensAnalyzed = allTokens.length;

  if (riskTokens.length === 0 && allTokens.length > 0) {
    score += 3;
  } else if (riskTokens.length > 5) {
    score -= 5;
    findings.push({ category: "riskTokens", description: `${riskTokens.length} risk-flagged tokens held`, severity: "CRITICAL", evidence: `OKX isRiskToken flag on ${riskTokens.length} tokens` });
  } else if (riskTokens.length > 0) {
    score -= 2;
    findings.push({ category: "riskTokens", description: `${riskTokens.length} risk-flagged token(s)`, severity: "MEDIUM", evidence: `Tokens flagged by OKX security` });
  }

  // Blue-chip quality
  rawMetrics.blueChipTokens = blueChips.length;
  rawMetrics.blueChipValue = formatUsd(blueChipValue);

  if (blueChips.length >= 5) { score += 4; }
  else if (blueChips.length >= 3) { score += 3; }
  else if (blueChips.length >= 1) { score += 2; }
  else if (allTokens.length > 5) {
    findings.push({ category: "quality", description: "No blue-chip tokens held", severity: "MEDIUM", evidence: "No USDT, USDC, DAI, WBTC, WETH, LINK, UNI, AAVE, or MKR" });
    score -= 1;
  }

  // Blue-chip ratio
  if (totalValue > 0) {
    const bcRatio = blueChipValue / totalValue;
    rawMetrics.blueChipRatio = `${(bcRatio * 100).toFixed(1)}%`;
    if (bcRatio > 0.5) { score += 3; }
    else if (bcRatio > 0.2) { score += 1; }
  }

  return {
    score: clamp(score),
    findings,
    evidence: {
      dataPoints: allTokens.length + securityScans.length,
      sources: compact(["OKX Token Risk Scan", "OKX tokenScan Security", securityScans.length > 0 ? "Deep Security Analysis" : null]),
      rawMetrics,
    },
  };
}

// ─── Axis 3: Fund Flow (0-25) ────────────────────────────────────────────

function scoreFundFlow(
  tokens: TokenWithValue[],
  totalValue: number,
  chainMap: Map<string, { count: number; value: number }>,
  riskTokenValue: number,
  poolRisks: PoolRiskAssessment[] = [],
): DimensionScore {
  let score = 5;
  const findings: Finding[] = [];
  const rawMetrics: Record<string, number | string> = {};

  rawMetrics.totalValueUsd = formatUsd(totalValue);

  // Portfolio size — larger = more trusted
  if (totalValue > 100000) { score += 5; }
  else if (totalValue > 10000) { score += 3; }
  else if (totalValue > 1000) { score += 2; }
  else if (totalValue > 10) { score += 1; }

  // Concentration risk — top token % of total
  if (tokens.length > 0 && totalValue > 0) {
    const topValue = tokens[0].usdValue;
    const concentration = topValue / totalValue;
    rawMetrics.concentrationRatio = `${(concentration * 100).toFixed(1)}%`;
    rawMetrics.topToken = tokens[0].symbol || "?";

    if (concentration > 0.95) {
      score -= 4;
      findings.push({ category: "concentration", description: "Single token >95% of portfolio", severity: "HIGH", evidence: `${tokens[0].symbol}: ${(concentration * 100).toFixed(1)}% of portfolio` });
    } else if (concentration > 0.8) {
      score -= 2;
      findings.push({ category: "concentration", description: "High portfolio concentration", severity: "MEDIUM", evidence: `Top token: ${(concentration * 100).toFixed(1)}%` });
    } else if (concentration < 0.3) {
      score += 3;
    } else if (concentration < 0.5) {
      score += 2;
    }
  }

  // Cross-chain value distribution
  if (chainMap.size >= 3) {
    score += 3;
    const chainBreakdown = Array.from(chainMap.entries())
      .map(([c, d]) => `${CHAIN_NAMES[c] || c}: ${formatUsd(d.value)}`)
      .join(", ");
    findings.push({ category: "crossChain", description: `Active across ${chainMap.size} chains`, severity: "LOW", evidence: chainBreakdown });
  } else if (chainMap.size >= 2) {
    score += 1;
  }

  // ── Uniswap Pool Liquidity Risk (NEW — from uniswap-client) ──
  if (poolRisks.length > 0) {
    const avgRiskScore = poolRisks.reduce((s, p) => s + p.riskScore, 0) / poolRisks.length;
    const maxConcentration = Math.max(...poolRisks.map(p => p.concentrationRatio));

    rawMetrics.poolsAnalyzed = poolRisks.length;
    rawMetrics.avgPoolSafety = Math.round(avgRiskScore);
    rawMetrics.maxPoolConcentration = `${(maxConcentration * 100).toFixed(1)}%`;

    if (avgRiskScore > 70) {
      score += 4;
      findings.push({ category: "liquidity", description: "Tokens have deep pool liquidity", severity: "LOW", evidence: `Avg pool safety: ${Math.round(avgRiskScore)}/100 across ${poolRisks.length} pools` });
    } else if (avgRiskScore > 40) {
      score += 2;
    } else {
      score -= 3;
      findings.push({ category: "liquidity", description: "Tokens have thin liquidity pools", severity: "HIGH", evidence: `Avg pool safety: ${Math.round(avgRiskScore)}/100 — high slippage risk` });
    }

    if (maxConcentration > 0.5) {
      score -= 2;
      findings.push({ category: "poolConcentration", description: "High liquidity concentration in pools", severity: "MEDIUM", evidence: `Max concentration ratio: ${(maxConcentration * 100).toFixed(1)}%` });
    }
  }

  // Risk token value exposure
  if (totalValue > 0) {
    const riskRatio = riskTokenValue / totalValue;
    rawMetrics.riskValueRatio = `${(riskRatio * 100).toFixed(1)}%`;
    if (riskRatio > 0.3) {
      score -= 3;
      findings.push({ category: "riskExposure", description: "High value in risk-flagged tokens", severity: "HIGH", evidence: `${(riskRatio * 100).toFixed(1)}% of value in risky tokens` });
    } else if (riskRatio > 0.1) {
      score -= 1;
    }
  }

  return {
    score: clamp(score),
    findings,
    evidence: {
      dataPoints: tokens.length + poolRisks.length,
      sources: compact([
        `OKX Portfolio (${chainMap.size} chains)`,
        chainMap.size > 1 ? "Cross-chain Analysis" : null,
        poolRisks.length > 0 ? "Uniswap Pool Risk Analysis" : null,
      ]),
      rawMetrics,
    },
  };
}

// ─── Axis 4: Behavioral Consistency (0-25) ───────────────────────────────

function scoreBehavioralConsistency(
  tokens: TokenWithValue[],
  totalValue: number,
  chainMap: Map<string, { count: number; value: number }>,
  blueChipValue: number,
  overview: PortfolioOverview | null = null,
): DimensionScore {
  let score = 3;
  const findings: Finding[] = [];
  const rawMetrics: Record<string, number | string> = {};

  // ── Trading history from Portfolio Overview (NEW — from OKX API) ──
  if (overview) {
    const totalTrades = parseInt(overview.totalTrades || "0", 10);
    const winRate = parseFloat(overview.winRate || "0");
    const totalPnl = parseFloat(overview.totalPnl || "0");

    rawMetrics.totalTrades = totalTrades;
    rawMetrics.winRate = `${(winRate * 100).toFixed(1)}%`;
    rawMetrics.totalPnl = formatUsd(totalPnl);

    // Trade count — active traders are more consistent
    if (totalTrades > 100) { score += 4; }
    else if (totalTrades > 30) { score += 3; }
    else if (totalTrades > 10) { score += 2; }
    else if (totalTrades > 0) { score += 1; }

    // Win rate — consistent winners are trustworthy
    if (winRate > 0.6) {
      score += 3;
      findings.push({ category: "performance", description: "Above-average trading win rate", severity: "LOW", evidence: `Win rate: ${(winRate * 100).toFixed(1)}% across ${totalTrades} trades` });
    } else if (winRate > 0.4) {
      score += 1;
    } else if (winRate < 0.2 && totalTrades > 10) {
      score -= 2;
      findings.push({ category: "performance", description: "Very low win rate", severity: "MEDIUM", evidence: `Win rate: ${(winRate * 100).toFixed(1)}% — possible bot or inexperienced trader` });
    }

    // PnL direction
    if (totalPnl > 1000) { score += 2; }
    else if (totalPnl < -5000) {
      score -= 1;
      findings.push({ category: "losses", description: "Significant cumulative losses", severity: "MEDIUM", evidence: `Total PnL: ${formatUsd(totalPnl)}` });
    }
  }

  // Portfolio composition consistency
  if (tokens.length >= 5 && totalValue > 0) {
    const values = tokens.map(t => t.usdValue);
    const top5Value = values.slice(0, 5).reduce((s, v) => s + v, 0);
    const top5Ratio = top5Value / totalValue;
    rawMetrics.top5Concentration = `${(top5Ratio * 100).toFixed(1)}%`;

    if (top5Ratio > 0.4 && top5Ratio < 0.8) {
      score += 3;
      findings.push({ category: "portfolioManagement", description: "Balanced portfolio distribution", severity: "LOW", evidence: `Top 5 tokens = ${(top5Ratio * 100).toFixed(1)}% of value` });
    }
  }

  // Chain consistency
  const chainsWithValue = Array.from(chainMap.entries()).filter(([, d]) => d.value > 10);
  rawMetrics.chainsWithValue = chainsWithValue.length;

  if (chainsWithValue.length >= 4) { score += 3; }
  else if (chainsWithValue.length >= 3) { score += 2; }
  else if (chainsWithValue.length >= 2) { score += 1; }

  // Blue-chip ratio as behavioral signal
  if (totalValue > 0) {
    const bcRatio = blueChipValue / totalValue;
    rawMetrics.stableAssetRatio = `${(bcRatio * 100).toFixed(1)}%`;

    if (bcRatio > 0.3) {
      score += 3;
      findings.push({ category: "maturity", description: "Significant allocation to established tokens", severity: "LOW", evidence: `${(bcRatio * 100).toFixed(1)}% in blue-chip assets` });
    } else if (bcRatio > 0.1) {
      score += 1;
    }
  }

  // Portfolio sophistication
  const uniqueSymbols = new Set(tokens.map(t => t.symbol?.toUpperCase()));
  rawMetrics.uniqueSymbols = uniqueSymbols.size;

  if (uniqueSymbols.size > 30) { score += 2; }
  else if (uniqueSymbols.size > 15) { score += 1; }

  return {
    score: clamp(score),
    findings,
    evidence: {
      dataPoints: tokens.length + chainMap.size + (overview ? 3 : 0),
      sources: compact(["OKX Balance Analysis", "Portfolio Composition", overview ? "OKX Portfolio Overview (PnL/WinRate)" : null]),
      rawMetrics,
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

function clamp(score: number): number {
  return Math.max(0, Math.min(25, Math.round(score)));
}

function compact(arr: (string | null)[]): string[] {
  return arr.filter((x): x is string => x !== null);
}

function formatUsd(value: number): string {
  if (value > 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value > 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value > 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function generateRecommendations(
  classification: "SAFE" | "CAUTION" | "BLOCKLIST",
  tp: DimensionScore,
  ci: DimensionScore,
  ff: DimensionScore,
  _bc: DimensionScore,
  agentProfile: AgentProfile,
): string[] {
  const recs: string[] = [];

  if (agentProfile.isAgent) {
    recs.push(
      `Identified as an AI agent wallet with ${agentProfile.totalDecisions} on-chain decisions logged.`
    );
    if (agentProfile.registeredOnChain) {
      recs.push("Agent is registered on the DecisionLineageLogger contract. Decision history is auditable.");
    }
  }

  if (classification === "BLOCKLIST") {
    recs.push("Exercise extreme caution. Significant risk indicators detected.");
  }

  if (ci.findings.some(f => f.category === "riskTokens" && f.severity === "CRITICAL")) {
    recs.push("Multiple risk-flagged tokens held. Investigate token legitimacy.");
  }

  if (ff.score < 10) {
    recs.push("High fund concentration risk. Portfolio lacks diversification.");
  }

  if (tp.score < 10 && !agentProfile.isAgent) {
    recs.push("Low on-chain activity. Wallet may be new or inactive.");
  }

  if (classification === "SAFE" && recs.length === 0) {
    recs.push("Healthy on-chain profile across multiple chains. Safe to interact with normal caution.");
  }

  if (classification === "CAUTION" && recs.length === 0) {
    recs.push("Proceed with caution. Some risk indicators present but not critical.");
  }

  return recs;
}
