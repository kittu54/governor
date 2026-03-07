"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface CallsCostChartProps {
  data: Array<{ date: string; calls: number; cost: number }>;
}

export function CallsCostChart({ data }: CallsCostChartProps) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22b8cf" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22b8cf" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f3672f" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#f3672f" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke="hsl(220 14% 18%)" />
          <XAxis dataKey="date" stroke="hsl(215 15% 45%)" tick={{ fill: "hsl(215 15% 45%)", fontSize: 12 }} />
          <YAxis yAxisId="calls" stroke="hsl(215 15% 45%)" tick={{ fill: "hsl(215 15% 45%)", fontSize: 12 }} />
          <YAxis yAxisId="cost" orientation="right" stroke="hsl(215 15% 45%)" tick={{ fill: "hsl(215 15% 45%)", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(220 18% 13%)",
              border: "1px solid hsl(220 14% 20%)",
              borderRadius: "8px",
              color: "hsl(210 20% 92%)",
              fontSize: 13
            }}
          />
          <Area yAxisId="calls" type="monotone" dataKey="calls" stroke="#22b8cf" fill="url(#callsGradient)" strokeWidth={2} />
          <Area yAxisId="cost" type="monotone" dataKey="cost" stroke="#f3672f" fill="url(#costGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
