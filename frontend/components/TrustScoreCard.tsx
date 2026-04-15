"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const RadarChart = dynamic(() => import("./RadarChart").then((m) => m.RadarChart), {
  ssr: false,
  loading: () => <div className="h-48 flex items-center justify-center text-xs text-ox-text-muted">Loading chart...</div>,
});

interface Finding {
  category: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  evidence: string;
}

interface DimensionEvidence {
  dataPoints: number;
  sources: string[];
  rawMetrics: Record<string, number | string>;
}

interface DimensionData {
  score: number;
  findings: Finding[];
  evidence?: DimensionEvidence;
}

export interface TrustScoreData {
  address: string;
  overallScore: number;
  classification: "SAFE" | "CAUTION" | "BLOCKLIST";
  summary?: string;
  dimensions: {
    transactionPatterns: DimensionData;
    contractInteractions: DimensionData;
    fundFlow: DimensionData;
    behavioralConsistency: DimensionData;
  };
  uniswapRisk: { poolsAnalyzed: number; avgLiquidityScore: number; concentrationRisk: number };
  agentProfile?: { isAgent: boolean; totalDecisions: number; registeredOnChain: boolean };
  recommendations: string[];
  metadata?: {
    chainsQueried: string[];
    totalDataPoints: number;
    queryDurationMs: number;
    freshness: string;
  };
}

const CLASS_STYLES = {
  SAFE: { color: "var(--ox-safe)", label: "Safe", badgeClass: "ox-badge-safe" },
  CAUTION: { color: "var(--ox-caution)", label: "Caution", badgeClass: "ox-badge-caution" },
  BLOCKLIST: { color: "var(--ox-danger)", label: "Blocklist", badgeClass: "ox-badge-danger" },
};

const DIM_LABELS: Record<string, string> = {
  transactionPatterns: "Transaction Patterns",
  contractInteractions: "Contract Interactions",
  fundFlow: "Fund Flow",
  behavioralConsistency: "Behavioral Consistency",
};

const SEVERITY_STYLES: Record<string, string> = {
  LOW: "bg-ox-safe/10 text-ox-safe border-ox-safe/20",
  MEDIUM: "bg-ox-caution/10 text-ox-caution border-ox-caution/20",
  HIGH: "bg-ox-danger/10 text-ox-danger border-ox-danger/20",
  CRITICAL: "bg-red-500/15 text-red-400 border-red-400/25",
};

export function TrustScoreCard({ data }: { data: TrustScoreData }) {
  const style = CLASS_STYLES[data.classification];
  const shortAddr = `${data.address.slice(0, 6)}...${data.address.slice(-4)}`;
  const pct = Math.min(100, Math.max(0, data.overallScore));
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(false);

  // Score tier label (no fake percentile)
  const tier = data.overallScore >= 80 ? "Strong" : data.overallScore >= 60 ? "Moderate" : data.overallScore >= 40 ? "Below average" : "Weak";

  return (
    <div className="ox-glass-16 ox-glass-edge-strong rounded-2xl overflow-hidden">
      {/* Header with score ring */}
      <div className="p-6 flex items-start gap-6">
        {/* Score circle */}
        <div className="relative shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(61, 46, 36, 0.3)" strokeWidth="6" />
            <circle
              cx="48" cy="48" r="40" fill="none"
              stroke={style.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="251.3"
              strokeDashoffset={251.3 - (251.3 * pct) / 100}
              transform="rotate(-90 48 48)"
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 6px ${style.color})` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold font-mono" style={{ color: style.color }}>
              {data.overallScore}
            </span>
            <span className="text-[10px] text-ox-text-muted">/100</span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-mono text-ox-text-secondary">{shortAddr}</span>
            <span className={`ox-badge ${style.badgeClass}`}>{style.label}</span>
            {data.agentProfile?.isAgent && (
              <span className="ox-badge bg-ox-cyan/15 text-ox-cyan border border-ox-cyan/25">
                AI Agent
                {data.agentProfile.totalDecisions > 0 && (
                  <span className="ml-1 opacity-70">{data.agentProfile.totalDecisions} decisions</span>
                )}
              </span>
            )}
          </div>
          <a
            href={`https://www.okx.com/web3/explorer/xlayer/address/${data.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ox-cyan-dim hover:text-ox-cyan transition-colors font-mono"
          >
            View on X Layer Explorer
          </a>

          {/* Metadata / Freshness */}
          {data.metadata && (
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-ox-text-muted">
              <span className="ox-glass-12 px-2 py-0.5 rounded-full">
                {data.metadata.totalDataPoints} data points
              </span>
              <span className="ox-glass-12 px-2 py-0.5 rounded-full">
                {data.metadata.chainsQueried.length} chains queried
              </span>
              <span className="ox-glass-12 px-2 py-0.5 rounded-full">
                {data.metadata.queryDurationMs}ms query time
              </span>
            </div>
          )}

          {/* Score tier */}
          <p className="text-[11px] text-ox-text-muted mt-2">
            Trust level: {tier}
          </p>

          {/* Narrative summary */}
          {data.summary && (
            <div className="mt-3 p-3 rounded-xl ox-glass-12 border border-ox-border/20">
              <p className="text-xs text-ox-text-secondary leading-relaxed">{data.summary}</p>
            </div>
          )}

          {/* Dimension bars with expand */}
          <div className="mt-4 space-y-2">
            {Object.entries(data.dimensions).map(([key, dim]) => {
              const pctDim = (dim.score / 25) * 100;
              const isExpanded = expandedDim === key;
              const hasEvidence = dim.evidence || dim.findings.length > 0;
              return (
                <div key={key}>
                  <div
                    role={hasEvidence ? "button" : undefined}
                    tabIndex={hasEvidence ? 0 : undefined}
                    aria-expanded={hasEvidence ? isExpanded : undefined}
                    aria-label={hasEvidence ? `${DIM_LABELS[key] || key} details` : undefined}
                    className={`cursor-pointer rounded-lg transition-colors ${hasEvidence ? "hover:bg-ox-surface/30" : ""} px-1 py-0.5 -mx-1`}
                    onClick={() => hasEvidence && setExpandedDim(isExpanded ? null : key)}
                    onKeyDown={(e) => { if (hasEvidence && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setExpandedDim(isExpanded ? null : key); } }}
                  >
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-ox-text-muted flex items-center gap-1">
                        {DIM_LABELS[key] || key}
                        {hasEvidence && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        )}
                      </span>
                      <span className="font-mono text-ox-text-secondary">{dim.score}/25</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ox-surface overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pctDim}%`,
                          background: `linear-gradient(90deg, ${style.color}88, ${style.color})`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Evidence panel */}
                  {isExpanded && (
                    <div className="mt-2 ml-2 p-3 rounded-xl ox-glass-12 animate-fade-in space-y-3">
                      {/* Sources */}
                      {dim.evidence && (
                        <div>
                          <div className="text-[10px] text-ox-text-muted uppercase tracking-wider mb-1">Data Sources</div>
                          <div className="flex flex-wrap gap-1">
                            {dim.evidence.sources.map((src) => (
                              <span key={src} className="text-[10px] ox-glass-16 px-2 py-0.5 rounded-full text-ox-text-secondary">
                                {src}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Raw metrics */}
                      {dim.evidence && Object.keys(dim.evidence.rawMetrics).length > 0 && (
                        <div>
                          <div className="text-[10px] text-ox-text-muted uppercase tracking-wider mb-1">Key Metrics</div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {Object.entries(dim.evidence.rawMetrics).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-[11px] ox-glass-12 px-2 py-1 rounded-lg">
                                <span className="text-ox-text-muted">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                                <span className="font-mono text-ox-text-secondary">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Findings */}
                      {dim.findings.length > 0 && (
                        <div>
                          <div className="text-[10px] text-ox-text-muted uppercase tracking-wider mb-1">Findings</div>
                          <div className="space-y-1.5">
                            {dim.findings.map((f, i) => (
                              <div key={i} className={`p-2 rounded-lg border text-xs ${SEVERITY_STYLES[f.severity]}`}>
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="font-semibold text-[10px] uppercase">{f.severity}</span>
                                  <span className="opacity-70">{f.category}</span>
                                </div>
                                <p className="text-ox-text-secondary">{f.description}</p>
                                <p className="text-[10px] opacity-60 mt-0.5 font-mono">{f.evidence}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Radar */}
      <div className="border-t border-ox-border/30 px-6 py-4">
        <h3 className="ox-heading mb-2">Radar Analysis</h3>
        <RadarChart dimensions={data.dimensions} color={style.color} />
      </div>

      {/* Uniswap Risk */}
      {data.uniswapRisk?.poolsAnalyzed > 0 && (
        <div className="border-t border-ox-border/30 px-6 py-4">
          <h3 className="ox-heading mb-3">Liquidity Risk</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="ox-glass-12 rounded-xl text-center py-3 px-2">
              <div className="text-lg font-bold font-mono text-ox-text-primary">{data.uniswapRisk.poolsAnalyzed}</div>
              <div className="text-[10px] text-ox-text-muted">Pools</div>
            </div>
            <div className="ox-glass-12 rounded-xl text-center py-3 px-2">
              <div className="text-lg font-bold font-mono text-ox-cyan">{data.uniswapRisk.avgLiquidityScore}</div>
              <div className="text-[10px] text-ox-text-muted">Liquidity</div>
            </div>
            <div className="ox-glass-12 rounded-xl text-center py-3 px-2">
              <div className="text-lg font-bold font-mono text-ox-caution">{data.uniswapRisk.concentrationRisk}%</div>
              <div className="text-[10px] text-ox-text-muted">Concentration</div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="border-t border-ox-border/30 px-6 py-4">
          <div className={`rounded-xl p-4 border ${
            data.classification === "BLOCKLIST"
              ? "bg-ox-danger/8 border-ox-danger/25"
              : data.classification === "CAUTION"
                ? "bg-ox-caution/8 border-ox-caution/25"
                : "bg-ox-safe/8 border-ox-safe/20"
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={style.color} strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: style.color }}>
                Recommendations
              </h3>
            </div>
            <ul className="space-y-2">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-ox-text-primary">
                  <span className="mt-1 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: `color-mix(in srgb, ${style.color} 15%, transparent)`, color: style.color }}>
                    {i + 1}
                  </span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Methodology */}
      <div className="border-t border-ox-border/30 px-6 py-4">
        <button
          onClick={() => setShowMethodology(!showMethodology)}
          className="flex items-center gap-2 text-xs text-ox-text-muted hover:text-ox-text-secondary transition-colors w-full"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showMethodology ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
          How is this score calculated? (click to expand)
        </button>

        {showMethodology && (
          <div className="mt-3 p-4 rounded-xl ox-glass-12 animate-fade-in text-xs text-ox-text-secondary space-y-3">
            <p>
              <strong className="text-ox-text-primary">4-Axis Model:</strong> Each wallet is scored across 4 dimensions (0-25 points each, 100 max).
              Scores are computed from real on-chain data queried across multiple EVM chains.
            </p>
            <div className="space-y-2">
              <div>
                <strong className="text-ox-text-primary">Transaction Patterns (0-25):</strong> Portfolio value, token diversity, transaction count, win rate, PnL performance.
              </div>
              <div>
                <strong className="text-ox-text-primary">Contract Interactions (0-25):</strong> Security scan (honeypots, risk levels, buy/sell taxes), token verification, market cap, holder count.
              </div>
              <div>
                <strong className="text-ox-text-primary">Fund Flow (0-25):</strong> Concentration risk, crashing token exposure, portfolio size, realized PnL.
              </div>
              <div>
                <strong className="text-ox-text-primary">Behavioral Consistency (0-25):</strong> Volume spike detection, leaderboard presence, trade frequency consistency, signal alignment.
              </div>
            </div>
            <p className="text-[10px] text-ox-text-muted">
              Data sourced from OKX OnchainOS APIs: Portfolio, Security, DEX Signal, DEX Market, DEX Token, and Leaderboard endpoints.
              {data.metadata && ` Queried ${data.metadata.chainsQueried.join(", ")}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
