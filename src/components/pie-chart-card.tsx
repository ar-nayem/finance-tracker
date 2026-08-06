"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatMoney } from "@/lib/format";

const SLICE_COLORS = ["#1E40AF", "#3B82F6", "#059669", "#F59E0B", "#DC2626", "#7C3AED", "#0891B2"];

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
    <div className="rounded-lg border border-border bg-muted p-4">
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
                background: "#101A34",
                border: "1px solid rgba(255,255,255,0.08)",
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
