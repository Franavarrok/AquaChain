import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../api/client";
import { getSocket, SOCKET_EVENTS } from "../realtime/socket";
import {
  Alert,
  AlertThresholds,
  Block,
  BlockchainStatusEvent,
  BlockchainStatusResponse,
  DashboardStats,
  Measurement,
} from "../types";

const LATEST_MEASUREMENTS_LIMIT = 20;
const CHART_MEASUREMENTS_LIMIT = 50;
const BLOCKS_LIMIT = 50;
const ALERTS_LIMIT = 20;

interface DashboardState {
  stats: DashboardStats | null;
  chartData: Measurement[];
  latestMeasurements: Measurement[];
  blocks: Block[];
  alerts: Alert[];
  alertThresholds: AlertThresholds | null;
  blockchainStatus: BlockchainStatusResponse | null;
}

interface UseRealtimeDashboardResult extends DashboardState {
  loading: boolean;
  error: string | null;
  /** true mientras el socket está conectado; false si se cayó la conexión (el snapshot REST sigue siendo válido, pero deja de actualizarse en vivo). */
  connected: boolean;
}

const initialState: DashboardState = {
  stats: null,
  chartData: [],
  latestMeasurements: [],
  blocks: [],
  alerts: [],
  alertThresholds: null,
  blockchainStatus: null,
};

/**
 * Reemplaza al viejo usePolling: el estado inicial se carga una sola vez vía
 * REST (snapshot), y a partir de ahí se mantiene sincronizado en tiempo real
 * escuchando los eventos que emite el backend por Socket.io
 * (measurement:new, alert:new, block:new, blockchain:status), en vez de
 * volver a pedir todo por HTTP cada N segundos.
 *
 * Todas las listas se mantienen acotadas en memoria (mismo límite que se
 * usaba para el fetch inicial) para que el dashboard no acumule mediciones
 * indefinidamente en una demo larga.
 */
export function useRealtimeDashboard(): UseRealtimeDashboardResult {
  const [state, setState] = useState<DashboardState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Mantiene una copia mutable del último valor de `stats` para poder
  // derivar campos (totalMeasurements++, lastUpdate) sin depender de un
  // closure desactualizado dentro de los listeners del socket.
  const statsRef = useRef<DashboardStats | null>(null);

  const loadSnapshot = useCallback(async () => {
    try {
      const [stats, chartData, latestMeasurements, blocks, alertsResult, blockchainStatus] = await Promise.all([
        api.getDashboardStats(),
        api.getChartMeasurements(CHART_MEASUREMENTS_LIMIT),
        api.getLatestMeasurements(LATEST_MEASUREMENTS_LIMIT),
        api.getBlockchain(BLOCKS_LIMIT),
        api.getAlerts(ALERTS_LIMIT),
        api.getBlockchainStatus(),
      ]);

      statsRef.current = stats;
      setState({
        stats,
        chartData,
        latestMeasurements,
        blocks,
        alerts: alertsResult.alerts,
        alertThresholds: alertsResult.thresholds,
        blockchainStatus,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al cargar el estado inicial.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const handleNewMeasurement = (measurement: Measurement) => {
      statsRef.current = statsRef.current
        ? {
            ...statsRef.current,
            totalMeasurements: statsRef.current.totalMeasurements + 1,
            lastUpdate: measurement.timestamp,
          }
        : statsRef.current;

      setState((prev) => ({
        ...prev,
        stats: statsRef.current,
        latestMeasurements: [measurement, ...prev.latestMeasurements].slice(0, LATEST_MEASUREMENTS_LIMIT),
        chartData: [...prev.chartData, measurement].slice(-CHART_MEASUREMENTS_LIMIT),
      }));
    };

    const handleNewAlert = (alert: Alert) => {
      statsRef.current = statsRef.current
        ? { ...statsRef.current, totalAlerts: statsRef.current.totalAlerts + 1 }
        : statsRef.current;

      setState((prev) => ({
        ...prev,
        stats: statsRef.current,
        alerts: [alert, ...prev.alerts].slice(0, ALERTS_LIMIT),
      }));
    };

    const handleNewBlock = (block: Block) => {
      setState((prev) => ({
        ...prev,
        blocks: [block, ...prev.blocks].slice(0, BLOCKS_LIMIT),
      }));
    };

    const handleBlockchainStatus = (status: BlockchainStatusEvent) => {
      statsRef.current = statsRef.current
        ? {
            ...statsRef.current,
            blockchainStatus: status.valid ? "VALID" : "INVALID",
            totalBlocks: status.totalBlocksChecked,
          }
        : statsRef.current;

      setState((prev) => ({
        ...prev,
        stats: statsRef.current,
        blockchainStatus: prev.blockchainStatus
          ? {
              ...prev.blockchainStatus,
              valid: status.valid,
              brokenAtIndex: status.brokenAtIndex,
              reason: status.reason,
              totalBlocks: status.totalBlocksChecked,
            }
          : prev.blockchainStatus,
      }));
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on(SOCKET_EVENTS.MEASUREMENT_NEW, handleNewMeasurement);
    socket.on(SOCKET_EVENTS.ALERT_NEW, handleNewAlert);
    socket.on(SOCKET_EVENTS.BLOCK_NEW, handleNewBlock);
    socket.on(SOCKET_EVENTS.BLOCKCHAIN_STATUS, handleBlockchainStatus);

    // Por si el socket ya estaba conectado antes de que este efecto corriera
    // (ej. en un remount rápido durante desarrollo con StrictMode).
    setConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off(SOCKET_EVENTS.MEASUREMENT_NEW, handleNewMeasurement);
      socket.off(SOCKET_EVENTS.ALERT_NEW, handleNewAlert);
      socket.off(SOCKET_EVENTS.BLOCK_NEW, handleNewBlock);
      socket.off(SOCKET_EVENTS.BLOCKCHAIN_STATUS, handleBlockchainStatus);
    };
  }, []);

  return { ...state, loading, error, connected };
}
