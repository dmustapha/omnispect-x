"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { fetchTrustScore } from "../lib/api";
import type { TrustScoreData } from "./TrustScoreCard";

const RadarChart = dynamic(() => import("./RadarChart").then((m) => m.RadarChart), {
  ssr: false,
  loading: () => <div className="h-48 flex items-center justify-center text-xs text-ox-text-muted">Loading chart...</div>,
});

interface AgentScore {
  address: string;
  data: TrustScoreData;
  color: string;
}

const AGENT_COLORS = [
  { hex: "#F28C18", label: "Amber" },
  { hex: "#D63F5A", label: "Rose" },
  { hex: "#E8A87C", label: "Peach" },
];

const CLASS_BADGE: Record<string, string> = {
  SAFE: "ox-badge-safe",
  CAUTION: "ox-badge-caution",
  BLOCKLIST: "ox-badge-danger",
};

const DIM_KEYS = ["transactionPatterns", "contractInteractions", "fundFlow", "behavioralConsistency"] as const;
const DIM_LABELS: Record<string, string> = {
  transactionPatterns: "Txn Patterns",
  contractInteractions: "Contract Int.",
  fundFlow: "Fund Flow",
  behavioralConsistency: "Consistency",
};

export function CompareView() {
  const [addresses, setAddresses] = useState(["", "", ""]);
  const [agents, setAgents] = useState<AgentScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function handleCompare() {
    const validAddrs = addresses.filter((a) => /^0x[a-fA-F0-9]{40}$/.test(a));
    if (validAddrs.length < 2) {
      setError("Enter at least 2 valid addresses to compare.");
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(validAddrs.map(fetchTrustScore));
      const scored: AgentScore[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          scored.push({ address: validAddrs[i], data: r.value, color: AGENT_COLORS[i % AGENT_COLORS.length].hex });
        }
      });
      setAgents(scored);
      if (scored.length === 0) setError("No results returned. Check the addresses and try again.");
    } catch {
      setError("Comparison failed. Please try again.");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  // Find overall winner
  const winner = agents.length >= 2
    ? agents.reduce((best, a) => a.data.overallScore > best.data.overallScore ? a : best)
    : null;

  return (
    <div>
      {/* Input area */}
      <div className="ox-glass-16 ox-glass-edge rounded-2xl p-5 mb-6">
        <p className="text-xs text-ox-text-muted mb-3">Enter at least 2 wallet addresses below, then click Compare. Each address gets scored independently and results are shown side by side.</p>
        <div className="space-y-2.5 mb-4">
          {addresses.map((addr, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: AGENT_COLORS[i].hex, boxShadow: `0 0 8px ${AGENT_COLORS[i].hex}40` }}
              />
              <input
                value={addr}
                onChange={(e) => {
                  const next = [...addresses];
                  next[i] = e.target.value;
                  setAddresses(next);
                }}
                placeholder={`Agent ${i + 1} address (0x...)`}
                aria-label={`Agent ${i + 1} wallet address`}
                className="ox-input flex-1 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleCompare}
          disabled={loading}
          className="ox-btn-primary px-5 py-2 text-sm w-full sm:w-auto"
        >
          {loading ? "Comparing..." : "Compare Agents"}
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-xl ox-glass-12 border border-ox-danger/20 text-ox-danger text-sm mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      {agents.length >= 2 && (
        <div className="animate-fade-in space-y-4">
          {/* Overall winner banner */}
          {winner && (
            <div className="ox-glass-16 ox-glass-edge rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: winner.color }} />
                <span className="text-sm font-medium text-ox-text-primary">
                  {winner.address.slice(0, 6)}...{winner.address.slice(-4)}
                </span>
                <span className={`ox-badge ${CLASS_BADGE[winner.data.classification] || ""}`}>
                  {winner.data.classification}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-ox-text-muted">Highest score:</span>
                <span className="font-display font-bold text-xl" style={{ color: winner.color }}>
                  {winner.data.overallScore}
                </span>
              </div>
            </div>
          )}

          {/* Dimension comparison table */}
          <div className="ox-glass-16 ox-glass-edge rounded-2xl p-5">
            <h3 className="ox-heading mb-4">Dimension Breakdown</h3>
            <div className="space-y-3">
              {DIM_KEYS.map((key) => {
                const scores = agents.map(a => ({ addr: a.address, score: a.data.dimensions[key]?.score ?? 0, color: a.color }));
                const maxScore = Math.max(...scores.map(s => s.score));
                const minScore = Math.min(...scores.map(s => s.score));
                const hasDiff = maxScore !== minScore;

                return (
                  <div key={key} className="ox-glass-12 rounded-xl p-3">
                    <div className="text-xs text-ox-text-muted mb-2">{DIM_LABELS[key]}</div>
                    <div className="space-y-1.5">
                      {scores.map((s) => {
                        const isWinner = hasDiff && s.score === maxScore;
                        const isLoser = hasDiff && s.score === minScore;
                        const delta = hasDiff ? s.score - scores[0].score : 0;
                        return (
                          <div key={s.addr} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <span className="text-[10px] font-mono text-ox-text-muted w-20 truncate">
                              {s.addr.slice(0, 6)}...
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-ox-surface overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${(s.score / 25) * 100}%`,
                                  backgroundColor: s.color,
                                }}
                              />
                            </div>
                            <span className={`text-xs font-mono w-6 text-right font-bold ${
                              isWinner ? "text-ox-safe" : isLoser ? "text-ox-danger" : "text-ox-text-secondary"
                            }`}>
                              {s.score}
                            </span>
                            {/* Delta */}
                            {hasDiff && scores.indexOf(s) > 0 && delta !== 0 && (
                              <span className={`text-[10px] font-mono w-8 ${delta > 0 ? "text-ox-safe" : "text-ox-danger"}`}>
                                {delta > 0 ? "+" : ""}{delta}
                              </span>
                            )}
                            {/* Winner indicator */}
                            {isWinner && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ox-safe)" strokeWidth="3" className="shrink-0">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent cards with radar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {agents.map((agent) => {
              const shortAddr = `${agent.address.slice(0, 6)}...${agent.address.slice(-4)}`;
              const isOverallWinner = winner?.address === agent.address;
              return (
                <div key={agent.address} className={`ox-glass-16 ox-glass-edge rounded-2xl p-4 ${isOverallWinner ? "ring-1 ring-ox-safe/30" : ""}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: agent.color }} />
                    <span className="text-xs font-mono text-ox-text-secondary">{shortAddr}</span>
                    <span className={`ox-badge ${CLASS_BADGE[agent.data.classification] || ""} ml-auto`}>
                      {agent.data.classification}
                    </span>
                  </div>

                  {/* Score ring */}
                  <div className="flex items-center gap-4 mb-3">
                    <div className="relative">
                      <svg width="64" height="64" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--ox-border)" strokeWidth="4" />
                        <circle
                          cx="32" cy="32" r="26" fill="none"
                          stroke={agent.color}
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray="163.4"
                          strokeDashoffset={163.4 - (163.4 * agent.data.overallScore) / 100}
                          transform="rotate(-90 32 32)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold font-mono" style={{ color: agent.color }}>
                          {agent.data.overallScore}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {Object.entries(agent.data.dimensions).map(([key, dim]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-[10px] text-ox-text-muted w-16 truncate">
                            {DIM_LABELS[key] || key}
                          </span>
                          <div className="flex-1 h-1 rounded-full bg-ox-surface overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${(dim.score / 25) * 100}%`,
                                backgroundColor: agent.color,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-ox-text-muted w-5 text-right">
                            {dim.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <RadarChart dimensions={agent.data.dimensions} color={agent.color} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
