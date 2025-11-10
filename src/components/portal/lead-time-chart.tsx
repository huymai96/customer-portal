"use client";

import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";

interface LeadTimePoint {
  label: string;
  value: number;
}

interface LeadTimeChartProps {
  data: LeadTimePoint[];
}

const formatValue = (value: number) => {
  if (value < 1) {
    return `${Math.round(value * 24)} hrs`;
  }
  return `${value.toFixed(1)} days`;
};

export function LeadTimeChart({ data }: LeadTimeChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-xs text-slate-400">Insufficient history for trendline.</p>;
  }

  return (
    <div className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, bottom: 0, left: 0, right: 0 }}>
          <defs>
            <linearGradient id="leadTimeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={{ stroke: "rgba(56,189,248,0.3)", strokeWidth: 1 }}
            formatter={(value: number) => formatValue(value)}
            labelFormatter={(label) => label}
            wrapperStyle={{ background: "rgba(15, 23, 42, 0.85)", border: "1px solid rgba(56,189,248,0.3)", borderRadius: "0.75rem", padding: "0.5rem", color: "#e2e8f0" }}
          />
          <Area type="monotone" dataKey="value" stroke="rgba(56,189,248,0.8)" strokeWidth={2} fill="url(#leadTimeGradient)" dot={{ r: 2 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
