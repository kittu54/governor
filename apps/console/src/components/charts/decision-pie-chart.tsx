"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface DecisionPieChartProps {
  data: Array<{ decision: string; value: number }>;
}

const COLORS = ["#0a8ea3", "#ce2b43", "#f3672f"];

export function DecisionPieChart({ data }: DecisionPieChartProps) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={70} outerRadius={110} dataKey="value" nameKey="decision" paddingAngle={4}>
            {data.map((entry, index) => (
              <Cell key={entry.decision} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
