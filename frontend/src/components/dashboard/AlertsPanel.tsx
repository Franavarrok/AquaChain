import React from "react";
import { Alert, AlertThresholds } from "../../types";

interface AlertsPanelProps {
  alerts: Alert[];
  thresholds: AlertThresholds | null;
}

const ALERT_LABELS: Record<string, { label: string; color: string }> = {
  HIGH_FLOW: { label: "Caudal alto", color: "text-red-400 bg-red-950/40 border-red-900/50" },
  LOW_FLOW: { label: "Caudal bajo", color: "text-orange-400 bg-orange-950/40 border-orange-900/50" },
  HIGH_LEVEL: { label: "Nivel crítico", color: "text-amber-400 bg-amber-950/40 border-amber-900/50" },
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, thresholds }) => {
  return (
    <div className="rounded-xl border border-aqua-900/40 bg-[#0c2033]/70 p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-200">Alertas por valores anómalos</h3>
        {thresholds && (
          <span className="text-[10px] font-mono text-slate-500">
            &gt;{thresholds.FLOW_HIGH} · &lt;{thresholds.FLOW_LOW} m³/s · &gt;{thresholds.LEVEL_HIGH}cm
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto max-h-72 pr-1">
        {alerts.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Sin alertas registradas todavía.</p>
        )}
        {alerts.map((alert) => {
          const meta = ALERT_LABELS[alert.type] ?? { label: alert.type, color: "text-slate-300 bg-slate-800/40 border-slate-700/50" };
          return (
            <div key={alert.id} className={`rounded-lg border px-3 py-2 text-xs ${meta.color}`}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold">{meta.label}</span>
                <span className="font-mono opacity-70">{formatTime(alert.timestamp)}</span>
              </div>
              <p className="opacity-90 leading-snug">{alert.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
