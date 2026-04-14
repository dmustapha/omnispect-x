"use client";

import { useState } from "react";
import { fetchTrustScore } from "../lib/api";
import { RadarChart } from "./RadarChart";

interface AgentScore {
  address: string;
  data: any;
  color: string;
}

const COLORS = ["#6366f1", "#22c55e", "#f59e0b"];

export function CompareView() {
  const [addresses, setAddresses] = useState(["", "", ""]);
  const [agents, setAgents] = useState<AgentScore[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleCompare() {
    const validAddrs = addresses.filter((a) => a.startsWith("0x") && a.length === 42);
    if (validAddrs.length < 2) return;

    setLoading(true);
    try {
      const results = await Promise.allSettled(validAddrs.map(fetchTrustScore));
      const scored: AgentScore[] = [];
      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          scored.push({ address: validAddrs[i], data: r.value, color: COLORS[i] });
        }
      });
      setAgents(scored);
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <div>
      <div className="space-y-2 mb-4">
        {addresses.map((addr, i) => (
          <input
            key={i}
            value={addr}
            onChange={(e) => {
              const next = [...addresses];
              next[i] = e.target.value;
              setAddresses(next);
            }}
            placeholder={`Agent ${i + 1} address (0x...)`}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
          />
        ))}
        <button
          onClick={handleCompare}
          disabled={loading}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Comparing..." : "Compare Agents"}
        </button>
      </div>

      {agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div key={agent.address} className="rounded-xl border border-slate-700 bg-slate-800/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }} />
                <span className="text-sm font-mono text-slate-300">
                  {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
                </span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{agent.data.overallScore}/100</div>
              <span className={`text-xs font-bold ${
                agent.data.classification === "SAFE" ? "text-green-400" :
                agent.data.classification === "CAUTION" ? "text-yellow-400" : "text-red-400"
              }`}>
                {agent.data.classification}
              </span>
              <RadarChart dimensions={agent.data.dimensions} color={agent.color} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
