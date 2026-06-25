import React from "react";
import { DashboardStats } from "../../types";

interface StatsPanelProps {
  stats: DashboardStats | null;
  loading: boolean;
}

function formatTimeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return "ahora mismo";
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `hace ${minutes}m`;
}

const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  accent?: string;
  sub?: string;
}> = ({ label, value, accent = "text-white", sub }) => (
  <div className="rounded-xl border border-aqua-900/40 bg-[#0c2033]/70 p-4 flex flex-col gap-1">
    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">{label}</span>
    <span className={`text-2xl font-semibold tabular-nums ${accent}`}>{value}</span>
    {sub && <span className="text-xs text-slate-500">{sub}</span>}
  </div>
);

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, loading }) => {
  const isValid = stats?.blockchainStatus === "VALID";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Mediciones totales"
        value={loading || !stats ? "…" : stats.totalMeasurements.toLocaleString("es-AR")}
      />
      <StatCard
        label="Alertas totales"
        value={loading || !stats ? "…" : stats.totalAlerts.toLocaleString("es-AR")}
        accent={stats && stats.totalAlerts > 0 ? "text-amber-400" : "text-white"}
      />
      <StatCard
        label="Estado blockchain"
        value={loading || !stats ? "…" : isValid ? "Íntegra ✓" : "Comprometida ✕"}
        accent={isValid ? "text-emerald-400" : "text-red-400"}
        sub={stats ? `${stats.totalBlocks} bloques` : undefined}
      />
      <StatCard
        label="Última actualización"
        value={loading || !stats ? "…" : formatTimeAgo(stats.lastUpdate)}
        accent="text-aqua-300"
      />
    </div>
  );
};
