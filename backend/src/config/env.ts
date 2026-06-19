import dotenv from "dotenv";
dotenv.config();

/**
 * Configuración centralizada de variables de entorno.
 *
 * Por qué esto importa para seguridad:
 * - Si falta una variable crítica (ej. DATABASE_URL), preferimos que el proceso
 *   falle inmediatamente al arrancar (fail-fast) en lugar de arrancar "a medias"
 *   y fallar de forma confusa en el primer request a la base de datos.
 * - Ninguna variable sensible tiene un valor hardcodeado de fallback en producción.
 */

interface AppConfig {
  nodeEnv: "development" | "production" | "test";
  port: number;
  databaseUrl: string;
  corsAllowedOrigins: string[];
  sensor: {
    intervalMs: number;
    anomalyProbability: number;
    autostart: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(
      `[CONFIG] Falta la variable de entorno requerida: ${name}. ` +
        `Revisá tu archivo .env o la configuración de variables de entorno en Render.`
    );
  }
  return value;
}

function parseOrigins(raw: string): string[] {
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

function buildConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV as AppConfig["nodeEnv"]) || "development";

  // En desarrollo local permitimos un fallback de conexión local;
  // en producción, DATABASE_URL es obligatoria (Neon) y no tiene fallback.
  const databaseUrl =
    nodeEnv === "production"
      ? requireEnv("DATABASE_URL")
      : requireEnv("DATABASE_URL", "postgresql://aquachain:aquachain@localhost:5432/aquachain");

  // CORS_ALLOWED_ORIGINS debe ser explícita en producción (dominio de Vercel).
  const corsRaw =
    nodeEnv === "production"
      ? requireEnv("CORS_ALLOWED_ORIGINS")
      : process.env.CORS_ALLOWED_ORIGINS || "http://localhost:5173";

  return {
    nodeEnv,
    port: Number(process.env.PORT) || 4000,
    databaseUrl,
    corsAllowedOrigins: parseOrigins(corsRaw),
    sensor: {
      intervalMs: Number(process.env.SENSOR_INTERVAL_MS) || 5000,
      anomalyProbability: Number(process.env.ANOMALY_PROBABILITY) || 0.15,
      autostart: (process.env.SENSOR_AUTOSTART ?? "true") === "true",
    },
    rateLimit: {
      windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000, // 1 minuto
      maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 120, // 120 req/min por IP
    },
  };
}

export const config: AppConfig = buildConfig();
