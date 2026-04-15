"use client";

import {
  Radar,
  RadarChart as RChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface Props {
  dimensions: {
    transactionPatterns: { score: number };
    contractInteractions: { score: number };
    fundFlow: { score: number };
    behavioralConsistency: { score: number };
  };
  color?: string;
}

export function RadarChart({ dimensions, color = "#F28C18" }: Props) {
  const data = [
    { axis: "Txn Patterns", value: dimensions.transactionPatterns.score, max: 25 },
    { axis: "Contract Int.", value: dimensions.contractInteractions.score, max: 25 },
    { axis: "Fund Flow", value: dimensions.fundFlow.score, max: 25 },
    { axis: "Consistency", value: dimensions.behavioralConsistency.score, max: 25 },
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <RChart data={data}>
        <PolarGrid stroke="rgba(61, 46, 36, 0.3)" strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: "var(--ox-text-secondary)", fontSize: 11, fontFamily: "var(--font-inter)" }}
        />
        <PolarRadiusAxis
          angle={30}
          domain={[0, 25]}
          tick={{ fill: "var(--ox-text-muted)", fontSize: 9 }}
          axisLine={false}
        />
        <Radar
          name="Trust"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RChart>
    </ResponsiveContainer>
  );
}
