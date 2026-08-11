"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const SERIES_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#7C3AED", "#0891B2"];

export function TrendChart({
  data,
  streamNames,
}: {
  data: Record<string, string | number>[];
  streamNames: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
        <XAxis dataKey="label" stroke="var(--chart-axis)" fontSize={12} />
        <YAxis stroke="var(--chart-axis)" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: "var(--chart-tooltip-bg)",
            border: "1px solid var(--chart-tooltip-border)",
            borderRadius: 8,
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        {streamNames.map((name, i) => (
          <Line
            key={name}
            type="linear"
            dataKey={name}
            stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
