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
              <stop offset="0%" stopColor="#0a8ea3" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#0a8ea3" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f3672f" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#f3672f" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" opacity={0.35} />
          <XAxis dataKey="date" />
          <YAxis yAxisId="calls" />
          <YAxis yAxisId="cost" orientation="right" />
          <Tooltip />
          <Area yAxisId="calls" type="monotone" dataKey="calls" stroke="#0a8ea3" fill="url(#callsGradient)" strokeWidth={2} />
          <Area yAxisId="cost" type="monotone" dataKey="cost" stroke="#f3672f" fill="url(#costGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
