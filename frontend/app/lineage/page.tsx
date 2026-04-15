"use client";

import { useState, useRef } from "react";
import { fetchLineage, fetchAgentStats } from "../../lib/api";
import { DecisionTree, type DecisionNode } from "../../components/DecisionTree";

export default function LineagePage() {
  const [address, setAddress] = useState("");
  const [decisions, setDecisions] = useState<DecisionNode[]>([]);
  const [stats, setStats] = useState<{
    totalDecisions: number;
    firstDecisionTimestamp: number;
    isRegistered: boolean;
    actionTypeCounts?: Record<string, number>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function handleSearch() {
    if (!address.startsWith("0x") || address.length !== 42) return;
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const [lineageData, statsData] = await Promise.all([
        fetchLineage(address),
        fetchAgentStats(address),
      ]);
      setDecisions(lineageData.decisions || []);
      setStats(statsData);
    } catch {
      setDecisions([]);
      setStats(null);
      setError("Failed to load lineage data. Check the address and try again.");
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ox-text-primary mb-1">Decision Lineage Explorer</h1>
        <p className="text-sm text-ox-text-muted">
          Trace every decision an agent made — from signal to execution — with on-chain proof
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="0x..."
          aria-label="Agent wallet address"
          className="ox-input flex-1 px-4 py-3 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="ox-btn-primary px-6 py-3 text-sm whitespace-nowrap"
        >
          {loading ? "Loading..." : "Explore"}
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-ox-danger/10 border border-ox-danger/20 text-ox-danger text-sm mb-4">
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="ox-glass-12 ox-glass-edge rounded-xl p-4">
            <div className="ox-stat-value text-ox-cyan">{stats.totalDecisions}</div>
            <div className="ox-stat-label">Total Decisions</div>
          </div>
          <div className="ox-glass-12 ox-glass-edge rounded-xl p-4">
            <div className="text-sm font-mono text-ox-text-secondary">
              {stats.firstDecisionTimestamp
                ? new Date(stats.firstDecisionTimestamp * 1000).toLocaleDateString()
                : "\u2014"}
            </div>
            <div className="ox-stat-label">First Decision</div>
          </div>
          <div className="ox-glass-12 ox-glass-edge rounded-xl p-4">
            <span className={`ox-badge ${stats.isRegistered ? "ox-badge-safe" : "ox-badge-danger"}`}>
              {stats.isRegistered ? "Registered" : "Unregistered"}
            </span>
            <div className="ox-stat-label mt-1">Agent Status</div>
          </div>
          {stats.actionTypeCounts && (
            <div className="ox-glass-12 ox-glass-edge rounded-xl p-4">
              <div className="text-sm font-mono text-ox-text-secondary">
                {Object.keys(stats.actionTypeCounts).length}
              </div>
              <div className="ox-stat-label">Action Types</div>
            </div>
          )}
        </div>
      )}

      {!stats && !loading && !error && (
        <div className="ox-glass-16 ox-glass-edge rounded-2xl p-8 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 text-ox-text-muted opacity-40">
            <circle cx="12" cy="5" r="2" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" />
            <path d="M12 7v4" /><path d="M8 13l4-2 4 2" /><path d="M6 17v-4" /><path d="M18 17v-4" />
          </svg>
          <p className="text-sm text-ox-text-muted">
            Enter a wallet address to explore its full decision chain
          </p>
          <p className="text-xs text-ox-text-muted mt-2 font-mono">
            Try: 0x131f3b6cD18039D87da0AaECaa5C8462Dd51855D
          </p>
        </div>
      )}

      {decisions.length > 0 && (
        <div className="animate-fade-in">
          <div className="ox-glow-line mb-4" />
          <DecisionTree decisions={decisions} />
        </div>
      )}
    </div>
  );
}
