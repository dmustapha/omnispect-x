"use client";

import { Radar, RadarChart as RChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface Props {
  dimensions: {
    transactionPatterns: { score: number };
    contractInteractions: { score: number };
    fundFlow: { score: number };
    behavioralConsistency: { score: number };
  };
  color?: string;
}

export function RadarChart({ dimensions, color = "#6366f1" }: Props) {
  const data = [
    { axis: "Txn Patterns", value: dimensions.transactionPatterns.score, max: 25 },
    { axis: "Contract Int.", value: dimensions.contractInteractions.score, max: 25 },
    { axis: "Fund Flow", value: dimensions.fundFlow.score, max: 25 },
    { axis: "Consistency", value: dimensions.behavioralConsistency.score, max: 25 },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RChart data={data}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: "#94a3b8", fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 25]} tick={{ fill: "#64748b", fontSize: 10 }} />
        <Radar name="Trust" dataKey="value" stroke={color} fill={color} fillOpacity={0.3} />
      </RChart>
    </ResponsiveContainer>
  );
}
