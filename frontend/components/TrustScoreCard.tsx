"use client";

import { RadarChart } from "./RadarChart";

interface TrustScoreData {
  address: string;
  overallScore: number;
  classification: "SAFE" | "CAUTION" | "BLOCKLIST";
  dimensions: {
    transactionPatterns: { score: number; findings: any[] };
    contractInteractions: { score: number; findings: any[] };
    fundFlow: { score: number; findings: any[] };
    behavioralConsistency: { score: number; findings: any[] };
  };
  uniswapRisk: { poolsAnalyzed: number; avgLiquidityScore: number; concentrationRisk: number };
  recommendations: string[];
}

const classColors = {
  SAFE: { bg: "bg-green-900/30", border: "border-green-500", text: "text-green-400" },
  CAUTION: { bg: "bg-yellow-900/30", border: "border-yellow-500", text: "text-yellow-400" },
  BLOCKLIST: { bg: "bg-red-900/30", border: "border-red-500", text: "text-red-400" },
};

export function TrustScoreCard({ data }: { data: TrustScoreData }) {
  const colors = classColors[data.classification];
  const shortAddr = `${data.address.slice(0, 6)}...${data.address.slice(-4)}`;

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-mono text-slate-200">{shortAddr}</h2>
          <span className={`text-sm font-bold ${colors.text}`}>{data.classification}</span>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-white">{data.overallScore}</div>
          <div className="text-sm text-slate-400">/ 100</div>
        </div>
      </div>

      <RadarChart dimensions={data.dimensions} />

      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-semibold text-slate-300">Breakdown</h3>
        {Object.entries(data.dimensions).map(([key, dim]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-slate-400">{formatDimName(key)}</span>
            <span className="text-slate-200 font-mono">{dim.score}/25</span>
          </div>
        ))}
      </div>

      {data.uniswapRisk.poolsAnalyzed > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-300 mb-1">Uniswap Risk</h3>
          <div className="text-sm text-slate-400">
            {data.uniswapRisk.poolsAnalyzed} pools analyzed |
            Liquidity: {data.uniswapRisk.avgLiquidityScore}/100 |
            Concentration: {data.uniswapRisk.concentrationRisk}%
          </div>
        </div>
      )}

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-1">Recommendations</h3>
        <ul className="space-y-1">
          {data.recommendations.map((rec, i) => (
            <li key={i} className="text-sm text-slate-400">• {rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function formatDimName(key: string): string {
  const map: Record<string, string> = {
    transactionPatterns: "Transaction Patterns",
    contractInteractions: "Contract Interactions",
    fundFlow: "Fund Flow",
    behavioralConsistency: "Behavioral Consistency",
  };
  return map[key] || key;
}
