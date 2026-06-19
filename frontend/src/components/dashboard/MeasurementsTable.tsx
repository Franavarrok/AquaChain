import React from "react";
import { Measurement } from "../../types";

interface MeasurementsTableProps {
  data: Measurement[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const MeasurementsTable: React.FC<MeasurementsTableProps> = ({ data }) => {
  return (
    <div className="rounded-xl border border-aqua-900/40 bg-[#0c2033]/70 p-4">
      <h3 className="text-sm font-medium text-slate-200 mb-3">Últimas mediciones</h3>
      <div className="overflow-y-auto max-h-80">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[#0c2033]">
            <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 font-mono border-b border-aqua-900/40">
              <th className="py-2 pr-2">Hora</th>
              <th className="py-2 pr-2">Sensor</th>
              <th className="py-2 pr-2">Caudal</th>
              <th className="py-2 pr-2">Nivel</th>
              <th className="py-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500 text-xs">
                  Esperando mediciones del simulador…
                </td>
              </tr>
            )}
            {data.map((m) => (
              <tr key={m.id} className="border-b border-aqua-900/20 hover:bg-aqua-900/10">
                <td className="py-2 pr-2 font-mono text-slate-400 text-xs">{formatTime(m.timestamp)}</td>
                <td className="py-2 pr-2 text-slate-300 text-xs font-mono">{m.sensorId}</td>
                <td className="py-2 pr-2 text-slate-200 tabular-nums">{m.flowRate.toFixed(2)} m³/s</td>
                <td className="py-2 pr-2 text-slate-200 tabular-nums">{m.waterLevel.toFixed(2)} cm</td>
                <td className="py-2">
                  {m.isAnomaly ? (
                    <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-medium">
                      ⚠ Anomalía
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                      ● Normal
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
