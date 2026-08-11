"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatMoney } from "@/lib/format";

const SLICE_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#7C3AED", "#0891B2", "#EC4899"];

export function PieChartCard({
  title,
  data,
  currency,
}: {
  title: string;
  data: { name: string; value: number }[];
  currency: string;
}) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="card">
      <h3 className="font-heading text-sm font-semibold text-foreground/80">
        {title} <span className="font-normal text-foreground/50">({currency})</span>
      </h3>
      {hasData ? (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
              {data.map((entry, i) => (
                <Cell key={entry.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatMoney(Number(value ?? 0), currency)}
              contentStyle={{
                background: "var(--chart-tooltip-bg)",
                border: "1px solid var(--chart-tooltip-border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <p className="mt-8 text-center text-sm text-foreground/50">No data for this period.</p>
      )}
    </div>
  );
}
