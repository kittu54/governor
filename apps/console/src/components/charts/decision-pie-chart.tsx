"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface DecisionPieChartProps {
  data: Array<{ decision: string; value: number }>;
}

const COLORS = ["#22b8cf", "#ef4444", "#f59e0b"];

export function DecisionPieChart({ data }: DecisionPieChartProps) {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={65}
            outerRadius={100}
            dataKey="value"
            nameKey="decision"
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={entry.decision} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(220 18% 13%)",
              border: "1px solid hsl(220 14% 20%)",
              borderRadius: "8px",
              color: "hsl(210 20% 92%)",
              fontSize: 13
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
