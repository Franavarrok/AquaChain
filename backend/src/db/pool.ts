import { Pool } from "pg";
import { config } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Seguridad de conexión a base de datos:
 * - Usamos exclusivamente `connectionString` (DATABASE_URL) leído de variables
 *   de entorno; nunca se hardcodean credenciales en el código.
 * - En producción forzamos SSL (`rejectUnauthorized: false` es lo que Neon
 *   recomienda para su modo serverless con certificados gestionados).
 * - Todas las consultas en los modelos usan placeholders parametrizados ($1, $2...)
 *   provistos por `pg`, lo que elimina el riesgo de SQL injection por construcción
 *   de strings. Nunca se concatena input de usuario directamente en una query.
 */
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.nodeEnv === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => {
  logger.error("Error inesperado en el pool de PostgreSQL", { error: err.message });
});

/**
 * Verifica la conexión a la base de datos con reintentos.
 * Útil al levantar el servicio en Render, donde Neon (serverless) puede
 * tardar en "despertar" la conexión tras inactividad (cold start).
 */
export async function waitForDatabase(retries = 10, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query("SELECT 1");
      logger.info("Conexión a PostgreSQL establecida correctamente.");
      return;
    } catch (err) {
      logger.warn(`Intento de conexión a DB ${attempt}/${retries} fallido. Reintentando en ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("No se pudo conectar a PostgreSQL tras varios intentos.");
}
