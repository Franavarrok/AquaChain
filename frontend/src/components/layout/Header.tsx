import React from "react";

interface HeaderProps {
  simulatorRunning?: boolean;
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="border-b border-aqua-900/40 bg-[#081521]/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 flex items-center justify-center rounded-lg bg-gradient-to-br from-aqua-500 to-aqua-800 shadow-lg shadow-aqua-900/50">
            <span className="text-lg">💧</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg leading-tight tracking-tight">
              Aqua<span className="text-aqua-400">CHAIN</span>
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight font-mono">
              Monitoreo hídrico verificable · DGI Mendoza
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="hidden sm:inline">Datos simulados</span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    </header>
  );
};
