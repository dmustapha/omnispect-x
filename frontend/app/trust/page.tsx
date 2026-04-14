"use client";

import { useState } from "react";
import { fetchTrustScore } from "../../lib/api";
import { TrustScoreCard } from "../../components/TrustScoreCard";

export default function TrustPage() {
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!address.startsWith("0x") || address.length !== 42) {
      setError("Enter a valid 0x address");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTrustScore(address);
      setResult(data);
    } catch (err) {
      setError(String(err));
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Trust Score Lookup</h1>
      <div className="flex gap-2 mb-6">
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Enter agent wallet address (0x...)"
          className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {loading ? "Scoring..." : "Score"}
        </button>
      </div>
      {error && <div className="text-red-400 text-sm mb-4">{error}</div>}
      {result && <TrustScoreCard data={result} />}
    </div>
  );
}
