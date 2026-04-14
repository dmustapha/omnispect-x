import { okxClient } from "../lib/okx-client";
import { uniswapClient } from "../lib/uniswap-client";
import type {
  TrustScoreRequest,
  TrustScoreResponse,
  Finding,
  DimensionScore,
  UniswapRiskAssessment,
  TokenBalance,
  SecurityReport,
  PriceInfo,
  KlineData,
} from "../types";

// ─── Main Entry Point ───────────────────────────────────────────────────────

export async function scoreTrust(req: TrustScoreRequest): Promise<TrustScoreResponse> {
  const { agentAddress, chainId = 196 } = req;
  const chainIndex = String(chainId);

  // Fetch all data in parallel (6 OnchainOS skills + Uniswap)
  const [portfolio, balances, smartMoneyData, securityData, priceData, klineData, uniswapRisk] =
    await Promise.allSettled([
      okxClient.walletPortfolio.totalValue(agentAddress, chainIndex),
      okxClient.walletPortfolio.allBalances(agentAddress, chainIndex),
      okxClient.dexSignal.smartMoney(chainIndex),
      fetchSecurityForTokens(agentAddress, chainIndex),
      fetchPricesForTokens(agentAddress, chainIndex),
      fetchKlinesForTokens(agentAddress, chainIndex),
      fetchUniswapRisk(agentAddress, chainIndex),
    ]);

  const portfolioVal = portfolio.status === "fulfilled" ? portfolio.value : null;
  const balanceList = balances.status === "fulfilled" ? balances.value : [];
  const smartMoney = smartMoneyData.status === "fulfilled" ? smartMoneyData.value : [];
  const security = securityData.status === "fulfilled" ? securityData.value : [];
  const prices = priceData.status === "fulfilled" ? priceData.value : [];
  const klines = klineData.status === "fulfilled" ? klineData.value : [];
  const uniRisk = uniswapRisk.status === "fulfilled"
    ? uniswapRisk.value
    : { poolsAnalyzed: 0, avgLiquidityScore: 0, concentrationRisk: 0 };

  // Compute 4-axis scores
  const tp = scoreTransactionPatterns(balanceList, portfolioVal, smartMoney, agentAddress);
  const ci = scoreContractInteractions(security, balanceList);
  const ff = scoreFundFlow(balanceList, portfolioVal, prices);
  const bc = scoreBehavioralConsistency(klines, smartMoney, agentAddress);

  // Normalize so axes sum to overallScore
  const rawSum = tp.score + ci.score + ff.score + bc.score;
  const overallScore = Math.max(0, Math.min(100, rawSum));

  // Classification
  const hasCritical = [...tp.findings, ...ci.findings, ...ff.findings, ...bc.findings]
    .some(f => f.severity === "CRITICAL");
  const hasHigh = [...tp.findings, ...ci.findings, ...ff.findings, ...bc.findings]
    .some(f => f.severity === "HIGH");

  let classification: "SAFE" | "CAUTION" | "BLOCKLIST";
  if (hasCritical || overallScore < 40) classification = "BLOCKLIST";
  else if (hasHigh || overallScore < 70) classification = "CAUTION";
  else classification = "SAFE";

  // Recommendations
  const recommendations = generateRecommendations(classification, tp, ci, ff, bc, uniRisk);

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
    uniswapRisk: uniRisk,
    recommendations,
    timestamp: Date.now(),
  };
}

// ─── Data Fetchers ──────────────────────────────────────────────────────────

async function fetchSecurityForTokens(
  agentAddress: string,
  chainIndex: string
): Promise<SecurityReport[]> {
  const balances = await okxClient.walletPortfolio.allBalances(agentAddress, chainIndex);
  const tokenAddresses = balances
    .filter(b => b.tokenAddress && b.tokenAddress !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
    .slice(0, 5)
    .map(b => b.tokenAddress);

  const results = await Promise.allSettled(
    tokenAddresses.map(addr => okxClient.security.tokenScan(addr, chainIndex))
  );
  return results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<SecurityReport>).value);
}

async function fetchPricesForTokens(
  agentAddress: string,
  chainIndex: string
): Promise<PriceInfo[]> {
  const balances = await okxClient.walletPortfolio.allBalances(agentAddress, chainIndex);
  const tokenAddresses = balances
    .filter(b => b.tokenAddress && b.tokenAddress !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
    .slice(0, 5)
    .map(b => b.tokenAddress);

  const results = await Promise.allSettled(
    tokenAddresses.map(addr => okxClient.dexMarket.price(addr, chainIndex))
  );
  return results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<PriceInfo>).value);
}

async function fetchKlinesForTokens(
  agentAddress: string,
  chainIndex: string
): Promise<KlineData[][]> {
  const balances = await okxClient.walletPortfolio.allBalances(agentAddress, chainIndex);
  const tokenAddresses = balances
    .filter(b => b.tokenAddress && b.tokenAddress !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
    .slice(0, 3)
    .map(b => b.tokenAddress);

  const results = await Promise.allSettled(
    tokenAddresses.map(addr => okxClient.dexMarket.kline(addr, "1H", chainIndex))
  );
  return results.filter(r => r.status === "fulfilled").map(r => (r as PromiseFulfilledResult<KlineData[]>).value);
}

async function fetchUniswapRisk(
  agentAddress: string,
  chainIndex: string
): Promise<UniswapRiskAssessment> {
  const balances = await okxClient.walletPortfolio.allBalances(agentAddress, chainIndex);
  const tokenAddresses = balances
    .filter(b => b.tokenAddress && b.tokenAddress !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee")
    .slice(0, 3)
    .map(b => b.tokenAddress);

  if (tokenAddresses.length === 0) {
    return { poolsAnalyzed: 0, avgLiquidityScore: 0, concentrationRisk: 0 };
  }

  const results = await Promise.allSettled(
    tokenAddresses.map(addr => uniswapClient.getPoolRisk(addr))
  );
  const risks = results.filter(r => r.status === "fulfilled")
    .map(r => (r as PromiseFulfilledResult<{ riskScore: number; concentrationRatio: number }>).value);

  if (risks.length === 0) {
    return { poolsAnalyzed: 0, avgLiquidityScore: 0, concentrationRisk: 0 };
  }

  return {
    poolsAnalyzed: risks.length,
    avgLiquidityScore: Math.round(risks.reduce((s, r) => s + r.riskScore, 0) / risks.length),
    concentrationRisk: Math.round(risks.reduce((s, r) => s + r.concentrationRatio, 0) / risks.length * 100),
  };
}

// ─── Axis Scorers (0-25 each) ───────────────────────────────────────────────

function scoreTransactionPatterns(
  balances: TokenBalance[],
  portfolio: { totalValue: string } | null,
  smartMoney: { address: string }[],
  agentAddress: string
): DimensionScore {
  let score = 12;
  const findings: Finding[] = [];

  const totalVal = portfolio ? parseFloat(portfolio.totalValue) : 0;
  if (totalVal > 100) { score += 3; }
  else if (totalVal > 10) { score += 1; }
  else if (totalVal === 0) {
    score -= 3;
    findings.push({ category: "portfolio", description: "Empty portfolio on X Layer", severity: "MEDIUM", evidence: "totalValue = 0" });
  }

  const tokenCount = balances.length;
  if (tokenCount > 5) { score += 3; }
  else if (tokenCount > 2) { score += 1; }
  else if (tokenCount <= 1) {
    score -= 2;
    findings.push({ category: "diversity", description: "Very few tokens held", severity: "LOW", evidence: `${tokenCount} tokens` });
  }

  const isSmartMoney = smartMoney.some(sm => sm.address.toLowerCase() === agentAddress.toLowerCase());
  if (isSmartMoney) {
    score += 4;
    findings.push({ category: "smartMoney", description: "Address appears in smart money tracker", severity: "LOW", evidence: "dex-signal match" });
  }

  return { score: clamp(score), findings };
}

function scoreContractInteractions(
  security: SecurityReport[],
  _balances: TokenBalance[]
): DimensionScore {
  let score = 12;
  const findings: Finding[] = [];

  const honeypots = security.filter(s => s.isHoneypot);
  if (honeypots.length > 0) {
    score -= 10;
    findings.push({
      category: "honeypot",
      description: `${honeypots.length} honeypot token(s) detected`,
      severity: "CRITICAL",
      evidence: "OKX security token-scan isHoneypot=true",
    });
  }

  const highRisk = security.filter(s => s.riskLevel === "high");
  if (highRisk.length > 0) {
    score -= 5;
    findings.push({
      category: "riskLevel",
      description: `${highRisk.length} high-risk token(s) held`,
      severity: "HIGH",
      evidence: "OKX security riskLevel=high",
    });
  }

  const lowRisk = security.filter(s => s.riskLevel === "low");
  if (lowRisk.length > 2) { score += 4; }
  else if (lowRisk.length > 0) { score += 2; }

  const taxTokens = security.filter(s => parseFloat(s.buyTax) > 5 || parseFloat(s.sellTax) > 5);
  if (taxTokens.length > 0) {
    score -= 3;
    findings.push({
      category: "tax",
      description: `${taxTokens.length} token(s) with >5% buy/sell tax`,
      severity: "MEDIUM",
      evidence: "OKX security tax scan",
    });
  }

  return { score: clamp(score), findings };
}

function scoreFundFlow(
  balances: TokenBalance[],
  portfolio: { totalValue: string } | null,
  prices: PriceInfo[]
): DimensionScore {
  let score = 12;
  const findings: Finding[] = [];

  const totalVal = portfolio ? parseFloat(portfolio.totalValue) : 0;

  if (balances.length > 0 && totalVal > 0) {
    const largestBalance = Math.max(
      ...balances.map(b => parseFloat(b.balance) * parseFloat(b.tokenPrice || "0"))
    );
    const concentration = largestBalance / totalVal;
    if (concentration > 0.9) {
      score -= 4;
      findings.push({
        category: "concentration",
        description: "Single token >90% of portfolio",
        severity: "MEDIUM",
        evidence: `Concentration: ${(concentration * 100).toFixed(1)}%`,
      });
    } else if (concentration < 0.5) {
      score += 3;
    }
  }

  const crashingTokens = prices.filter(p => parseFloat(p.change24h) < -30);
  if (crashingTokens.length > 0) {
    score -= 3;
    findings.push({
      category: "priceRisk",
      description: `${crashingTokens.length} token(s) down >30% in 24h`,
      severity: "HIGH",
      evidence: "OKX dex-market price change24h",
    });
  }

  if (totalVal > 50) score += 3;
  else if (totalVal > 5) score += 1;

  return { score: clamp(score), findings };
}

function scoreBehavioralConsistency(
  klines: KlineData[][],
  smartMoney: { address: string }[],
  agentAddress: string
): DimensionScore {
  let score = 12;
  const findings: Finding[] = [];

  const validKlines = klines.filter(k => k.length > 0);
  if (validKlines.length > 2) { score += 3; }
  else if (validKlines.length > 0) { score += 1; }

  for (const tokenKlines of validKlines) {
    if (tokenKlines.length < 2) continue;
    const volumes = tokenKlines.map(k => parseFloat(k.vol));
    const avgVol = volumes.reduce((s, v) => s + v, 0) / volumes.length;
    const maxVol = Math.max(...volumes);

    if (avgVol > 0 && maxVol > avgVol * 10) {
      score -= 3;
      findings.push({
        category: "volumeSpike",
        description: "Extreme volume spike detected in held token",
        severity: "MEDIUM",
        evidence: `Max volume ${maxVol.toFixed(0)} vs avg ${avgVol.toFixed(0)}`,
      });
      break;
    }
  }

  const agentActivities = smartMoney.filter(
    sm => sm.address.toLowerCase() === agentAddress.toLowerCase()
  );
  if (agentActivities.length > 3) {
    score += 4;
    findings.push({
      category: "activeTrader",
      description: "Frequent smart money activity",
      severity: "LOW",
      evidence: `${agentActivities.length} recent activities`,
    });
  }

  return { score: clamp(score), findings };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function clamp(score: number): number {
  return Math.max(0, Math.min(25, Math.round(score)));
}

function generateRecommendations(
  classification: "SAFE" | "CAUTION" | "BLOCKLIST",
  tp: DimensionScore,
  ci: DimensionScore,
  ff: DimensionScore,
  _bc: DimensionScore,
  uniRisk: UniswapRiskAssessment
): string[] {
  const recs: string[] = [];

  if (classification === "BLOCKLIST") {
    recs.push("DO NOT interact with this agent. Critical security flags detected.");
  }

  if (ci.findings.some(f => f.category === "honeypot")) {
    recs.push("Agent holds honeypot tokens — likely compromised or malicious.");
  }

  if (ff.score < 10) {
    recs.push("Fund flow analysis shows high concentration risk. Diversify before trusting.");
  }

  if (tp.score < 10) {
    recs.push("Low transaction activity. Agent may be new or inactive.");
  }

  if (uniRisk.avgLiquidityScore < 30) {
    recs.push("Agent's tokens have low Uniswap liquidity — exit may be difficult.");
  }

  if (classification === "SAFE" && recs.length === 0) {
    recs.push("Agent shows healthy on-chain behavior. Safe to interact with normal caution.");
  }

  if (classification === "CAUTION" && recs.length === 0) {
    recs.push("Proceed with caution. Some risk indicators present but not critical.");
  }

  return recs;
}
