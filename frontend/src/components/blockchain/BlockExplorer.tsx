import React, { useState } from "react";
import { Block } from "../../types";

interface BlockExplorerProps {
  blocks: Block[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export const BlockExplorer: React.FC<BlockExplorerProps> = ({ blocks }) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="rounded-xl border border-aqua-900/40 bg-[#0c2033]/70 p-4">
      <h3 className="text-sm font-medium text-slate-200 mb-3">Historial de bloques</h3>

      <div className="flex flex-col gap-2 overflow-y-auto max-h-96 pr-1">
        {blocks.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">Aún no se generaron bloques.</p>
        )}
        {blocks.map((block) => {
          const isOpen = expanded === block.index;
          return (
            <button
              key={block.index}
              onClick={() => setExpanded(isOpen ? null : block.index)}
              className="text-left rounded-lg border border-aqua-900/30 bg-[#081521]/60 px-3 py-2 hover:border-aqua-700/60 transition-colors"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-aqua-400 font-semibold">Bloque #{block.index}</span>
                <span className="font-mono text-slate-500">{formatTime(block.timestamp)}</span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-1 truncate">
                hash: {block.hash.slice(0, 24)}…
              </p>
              {isOpen && (
                <div className="mt-2 pt-2 border-t border-aqua-900/30 text-[11px] font-mono text-slate-400 flex flex-col gap-1 break-all">
                  <div>
                    <span className="text-slate-500">Medición ID: </span>
                    {block.measurementId}
                  </div>
                  <div>
                    <span className="text-slate-500">Hash actual: </span>
                    <span className="text-aqua-300">{block.hash}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Hash anterior: </span>
                    <span className="text-slate-300">{block.previousHash}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Data hash: </span>
                    <span className="text-slate-300">{block.dataHash}</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
