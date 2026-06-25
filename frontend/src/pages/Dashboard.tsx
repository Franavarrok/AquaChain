import React from "react";
import { api } from "../api/client";
import { usePolling } from "../hooks/usePolling";
import { Header } from "../components/layout/Header";
import { StatsPanel } from "../components/dashboard/StatsPanel";
import { FlowChart } from "../components/dashboard/FlowChart";
import { LevelChart } from "../components/dashboard/LevelChart";
import { MeasurementsTable } from "../components/dashboard/MeasurementsTable";
import { AlertsPanel } from "../components/dashboard/AlertsPanel";
import { BlockchainStatus } from "../components/blockchain/BlockchainStatus";
import { BlockExplorer } from "../components/blockchain/BlockExplorer";

const POLL_INTERVAL_MS = 4000;

export const Dashboard: React.FC = () => {
  const stats = usePolling(() => api.getDashboardStats(), POLL_INTERVAL_MS);
  const chartData = usePolling(() => api.getChartMeasurements(50), POLL_INTERVAL_MS);
  const latestMeasurements = usePolling(() => api.getLatestMeasurements(20), POLL_INTERVAL_MS);
  const blockchainStatus = usePolling(() => api.getBlockchainStatus(), POLL_INTERVAL_MS);
  const blocks = usePolling(() => api.getBlockchain(50), POLL_INTERVAL_MS);
  const alertsData = usePolling(() => api.getAlerts(20), POLL_INTERVAL_MS);

  const hasFetchError =
    stats.error || chartData.error || latestMeasurements.error || blockchainStatus.error || blocks.error || alertsData.error;

  return (
    <div className="min-h-screen text-slate-100">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6">
        {hasFetchError && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 text-red-300 text-sm px-4 py-3">
            No se pudo conectar con el backend. Verificá que esté corriendo en{" "}
            <code className="font-mono">http://localhost:4000</code>.
          </div>
        )}

        <StatsPanel stats={stats.data} loading={stats.loading} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FlowChart data={chartData.data ?? []} />
          <LevelChart data={chartData.data ?? []} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MeasurementsTable data={latestMeasurements.data ?? []} />
          </div>
          <AlertsPanel alerts={alertsData.data?.alerts ?? []} thresholds={alertsData.data?.thresholds ?? null} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BlockchainStatus status={blockchainStatus.data} />
          <div className="lg:col-span-2">
            <BlockExplorer blocks={blocks.data ?? []} />
          </div>
        </div>

        <footer className="text-center text-xs text-slate-600 py-4 font-mono">
          AquaCHAIN MVP · Hackatón universitaria · Datos generados por simulador IoT
        </footer>
      </main>
    </div>
  );
};
