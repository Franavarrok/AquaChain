import React from "react";
import { useRealtimeDashboard } from "../hooks/useRealtimeDashboard";
import { Header } from "../components/layout/Header";
import { StatsPanel } from "../components/dashboard/StatsPanel";
import { FlowChart } from "../components/dashboard/FlowChart";
import { LevelChart } from "../components/dashboard/LevelChart";
import { MeasurementsTable } from "../components/dashboard/MeasurementsTable";
import { AlertsPanel } from "../components/dashboard/AlertsPanel";
import { BlockchainStatus } from "../components/blockchain/BlockchainStatus";
import { BlockExplorer } from "../components/blockchain/BlockExplorer";

export const Dashboard: React.FC = () => {
  const {
    stats,
    chartData,
    latestMeasurements,
    blocks,
    alerts,
    alertThresholds,
    blockchainStatus,
    loading,
    error,
    connected,
  } = useRealtimeDashboard();

  return (
    <div className="min-h-screen text-slate-100">
      <Header connected={connected} />

      <main className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 text-red-300 text-sm px-4 py-3">
            {error} Verificá que el backend esté corriendo y que tu <code className="font-mono">VITE_API_URL</code>{" "}
            apunte a la URL correcta.
          </div>
        )}

        {!error && !connected && !loading && (
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 text-amber-300 text-sm px-4 py-3">
            Conexión en tiempo real interrumpida. Los datos que ves quedaron en el último estado recibido — intentando
            reconectar automáticamente.
          </div>
        )}

        <StatsPanel stats={stats} loading={loading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FlowChart data={chartData} />
          <LevelChart data={chartData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MeasurementsTable data={latestMeasurements} />
          </div>
          <AlertsPanel alerts={alerts} thresholds={alertThresholds} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BlockchainStatus status={blockchainStatus} />
          <div className="lg:col-span-2">
            <BlockExplorer blocks={blocks} />
          </div>
        </div>

        <footer className="text-center text-xs text-slate-600 py-4 font-mono">
          AquaCHAIN MVP · Hackatón universitaria · Datos generados por simulador IoT · Tiempo real vía Socket.io
        </footer>
      </main>
    </div>
  );
};
