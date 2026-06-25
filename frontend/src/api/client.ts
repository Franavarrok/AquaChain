import axios from "axios";
import {
  Alert,
  AlertThresholds,
  Block,
  BlockchainStatusResponse,
  DashboardStats,
  Measurement,
} from "../types";

// En desarrollo (Vite), VITE_API_URL puede inyectarse vía .env.
// En Docker Compose, se inyecta como variable de entorno en build time.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

export const api = {
  async getDashboardStats(): Promise<DashboardStats> {
    const { data } = await client.get<{ data: DashboardStats }>("/dashboard/stats");
    return data.data;
  },

  async getLatestMeasurements(limit = 20): Promise<Measurement[]> {
    const { data } = await client.get<{ data: Measurement[] }>("/measurements", {
      params: { limit },
    });
    return data.data;
  },

  async getChartMeasurements(limit = 50): Promise<Measurement[]> {
    const { data } = await client.get<{ data: Measurement[] }>("/measurements/chart", {
      params: { limit },
    });
    return data.data;
  },

  async getBlockchain(limit = 100): Promise<Block[]> {
    const { data } = await client.get<{ data: Block[] }>("/blockchain", {
      params: { limit },
    });
    return data.data;
  },

  async getBlockchainStatus(): Promise<BlockchainStatusResponse> {
    const { data } = await client.get<{ data: BlockchainStatusResponse }>("/blockchain/status");
    return data.data;
  },

  async getAlerts(limit = 20): Promise<{ alerts: Alert[]; thresholds: AlertThresholds }> {
    const { data } = await client.get<{ data: Alert[]; thresholds: AlertThresholds }>("/alerts", {
      params: { limit },
    });
    return { alerts: data.data, thresholds: data.thresholds };
  },
};
