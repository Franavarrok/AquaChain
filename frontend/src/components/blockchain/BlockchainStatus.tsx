import React from "react";
import { BlockchainStatusResponse } from "../../types";

interface BlockchainStatusProps {
  status: BlockchainStatusResponse | null;
}

export const BlockchainStatus: React.FC<BlockchainStatusProps> = ({ status }) => {
  const isValid = status?.valid ?? null;

  return (
    <div className="rounded-xl border border-aqua-900/40 bg-[#0c2033]/70 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200">Estado de la blockchain</h3>
        <span className="text-[11px] font-mono text-slate-500">SHA-256</span>
      </div>

      <div className="flex items-center gap-3">
        <div
          className={`h-12 w-12 rounded-full flex items-center justify-center text-xl border ${
            isValid === null
              ? "border-slate-700 text-slate-500"
              : isValid
              ? "border-emerald-700 bg-emerald-950/40 text-emerald-400"
              : "border-red-700 bg-red-950/40 text-red-400"
          }`}
        >
          {isValid === null ? "…" : isValid ? "✓" : "✕"}
        </div>
        <div>
          <p className={`font-semibold ${isValid ? "text-emerald-400" : isValid === false ? "text-red-400" : "text-slate-400"}`}>
            {isValid === null ? "Verificando…" : isValid ? "Cadena íntegra" : "Cadena comprometida"}
          </p>
          <p className="text-xs text-slate-500">
            {status ? `${status.totalBlocks} bloques en la cadena` : "—"}
          </p>
        </div>
      </div>

      {status && (
        <div className="grid grid-cols-1 gap-2 text-xs font-mono text-slate-400 border-t border-aqua-900/30 pt-3">
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Último hash:</span>
            <span className="truncate text-slate-300">{status.lastHash.slice(0, 16)}…</span>
          </div>
          {status.brokenAtIndex !== null && (
            <div className="flex justify-between gap-2 text-red-400">
              <span>Rotura detectada en bloque:</span>
              <span>#{status.brokenAtIndex}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
