"use client";

import { useState } from "react";
import { fetchLineage, fetchAgentStats } from "../../lib/api";
import { DecisionTree } from "../../components/DecisionTree";

export default function LineagePage() {
  const [address, setAddress] = useState("");
  const [decisions, setDecisions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    if (!address.startsWith("0x")) return;
    setLoading(true);
    try {
      const [lineageData, statsData] = await Promise.all([
        fetchLineage(address),
        fetchAgentStats(address),
      ]);
      setDecisions(lineageData.decisions || []);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Decision Lineage Explorer</h1>
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
          {loading ? "Loading..." : "Explore"}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
            <div className="text-2xl font-bold text-white">{stats.totalDecisions}</div>
            <div className="text-sm text-slate-400">Total Decisions</div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
            <div className="text-sm font-mono text-slate-200">
              {stats.firstDecisionTimestamp ? new Date(stats.firstDecisionTimestamp * 1000).toLocaleDateString() : "—"}
            </div>
            <div className="text-sm text-slate-400">First Decision</div>
          </div>
          <div className="rounded-lg bg-slate-800/50 p-4 border border-slate-700">
            <div className={`text-sm font-bold ${stats.isRegistered ? "text-green-400" : "text-red-400"}`}>
              {stats.isRegistered ? "Registered" : "Not Registered"}
            </div>
            <div className="text-sm text-slate-400">Agent Status</div>
          </div>
        </div>
      )}

      <DecisionTree decisions={decisions} />
    </div>
  );
}
