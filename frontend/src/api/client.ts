import axios, { AxiosError } from "axios";
import {
  Alert,
  AlertThresholds,
  Block,
  BlockchainStatusResponse,
  DashboardStats,
  Measurement,
} from "../types";

// En desarrollo (Vite), VITE_API_URL puede inyectarse vía .env.
// En producción (Vercel), se configura como variable de entorno de build.
// Nunca se hardcodea ninguna credencial acá: la API pública no requiere
// ninguna, y este archivo solo conoce la URL base, no datos sensibles.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
});

/**
 * Normaliza cualquier error de red/HTTP en un mensaje legible para el
 * dashboard, sin filtrar detalles internos del backend (ej. stack traces)
 * al usuario final. Esto es la contraparte frontend del manejo centralizado
 * de errores del backend: el frontend tampoco debería confiar ciegamente en
 * que toda respuesta es exitosa o tiene la forma esperada.
 */
function toFriendlyErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<{ error?: string }>;
    if (axiosErr.response) {
      // El backend respondió, pero con un código de error (4xx/5xx).
      return axiosErr.response.data?.error || `Error del servidor (${axiosErr.response.status}).`;
    }
    // La request nunca llegó a destino: backend caído, CORS, sin red, etc.
    return "No se pudo conectar con el backend de AquaCHAIN.";
  }
  return "Ocurrió un error inesperado al consultar la API.";
}

export const api = {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const { data } = await client.get<{ data: DashboardStats }>("/dashboard/stats");
      return data.data;
    } catch (err) {
      throw new Error(toFriendlyErrorMessage(err));
    }
  },

  async getLatestMeasurements(limit = 20): Promise<Measurement[]> {
    try {
      const { data } = await client.get<{ data: Measurement[] }>("/measurements", {
        params: { limit },
      });
      return data.data;
    } catch (err) {
      throw new Error(toFriendlyErrorMessage(err));
    }
  },

  async getChartMeasurements(limit = 50): Promise<Measurement[]> {
    try {
      const { data } = await client.get<{ data: Measurement[] }>("/measurements/chart", {
        params: { limit },
      });
      return data.data;
    } catch (err) {
      throw new Error(toFriendlyErrorMessage(err));
    }
  },

  async getBlockchain(limit = 100): Promise<Block[]> {
    try {
      const { data } = await client.get<{ data: Block[] }>("/blockchain", {
        params: { limit },
      });
      return data.data;
    } catch (err) {
      throw new Error(toFriendlyErrorMessage(err));
    }
  },

  async getBlockchainStatus(): Promise<BlockchainStatusResponse> {
    try {
      const { data } = await client.get<{ data: BlockchainStatusResponse }>("/blockchain/status");
      return data.data;
    } catch (err) {
      throw new Error(toFriendlyErrorMessage(err));
    }
  },

  async getAlerts(limit = 20): Promise<{ alerts: Alert[]; thresholds: AlertThresholds }> {
    try {
      const { data } = await client.get<{ data: Alert[]; thresholds: AlertThresholds }>("/alerts", {
        params: { limit },
      });
      return { alerts: data.data, thresholds: data.thresholds };
    } catch (err) {
      throw new Error(toFriendlyErrorMessage(err));
    }
  },
};
