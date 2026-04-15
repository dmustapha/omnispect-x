"use client";

import { useState, useRef } from "react";
import { fetchTrustScore } from "../../lib/api";
import { TrustScoreCard } from "../../components/TrustScoreCard";
import { SkillLoadingSteps } from "../../components/SkillLoadingSteps";

export default function TrustPage() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function handleSearch() {
    if (!address.startsWith("0x") || address.length !== 42) {
      setError("Enter a valid 0x address");
      return;
    }
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchTrustScore(address);
      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ox-text-primary mb-1">Trust Score Lookup</h1>
        <p className="text-sm text-ox-text-muted">
          Multi-chain trust analysis across Ethereum, BSC, Polygon, Arbitrum & X Layer
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="0x..."
          aria-label="Wallet address"
          className="ox-input flex-1 px-4 py-3 text-sm"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="ox-btn-primary px-6 py-3 text-sm whitespace-nowrap"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Scoring...
            </span>
          ) : (
            "Score"
          )}
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 rounded-lg bg-ox-danger/10 border border-ox-danger/20 text-ox-danger text-sm mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
          </svg>
          {error}
        </div>
      )}

      <SkillLoadingSteps active={loading} done={!!result && !loading} />

      {!result && !loading && !error && (
        <div className="ox-glass-16 ox-glass-edge rounded-2xl p-8 text-center">
          <div className="text-ox-text-muted mb-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-3 opacity-40">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <p className="text-sm text-ox-text-muted">
            Enter a wallet address to analyze trust across 4 behavioral dimensions
          </p>
          <p className="text-xs text-ox-text-muted mt-2 font-mono">
            Try: 0x131f3b6cD18039D87da0AaECaa5C8462Dd51855D
          </p>
        </div>
      )}

      {result && (
        <div className="animate-fade-in">
          <TrustScoreCard data={result} />
        </div>
      )}
    </div>
  );
}
