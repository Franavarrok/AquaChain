import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Measurement } from "../../types";

interface FlowChartProps {
  data: Measurement[];
}

function formatTick(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const FlowChart: React.FC<FlowChartProps> = ({ data }) => {
  const chartData = data.map((m) => ({
    timestamp: m.timestamp,
    caudal: m.flowRate,
  }));

  return (
    <div className="rounded-xl border border-aqua-900/40 bg-[#0c2033]/70 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-slate-200">Caudal en tiempo real</h3>
        <span className="text-[11px] font-mono text-slate-500">m³/s</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="flowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22a1f5" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#22a1f5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#15324a" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTick}
            stroke="#3a5670"
            tick={{ fontSize: 10, fill: "#7e97ad" }}
            minTickGap={30}
          />
          <YAxis stroke="#3a5670" tick={{ fontSize: 10, fill: "#7e97ad" }} domain={[0, 210]} />
          <Tooltip
            contentStyle={{ backgroundColor: "#0c2033", border: "1px solid #15324a", borderRadius: 8 }}
            labelStyle={{ color: "#7e97ad" }}
            labelFormatter={(label) => formatTick(label as string)}
            formatter={(value: number) => [`${value} m³/s`, "Caudal"]}
          />
          <ReferenceLine y={140} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Alto", fill: "#f59e0b", fontSize: 10, position: "right" }} />
          <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Bajo", fill: "#f59e0b", fontSize: 10, position: "right" }} />
          <Area type="monotone" dataKey="caudal" stroke="#22a1f5" strokeWidth={2} fill="url(#flowGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
