/* eslint-disable no-console */

/**
 * Sistema de logs simple para auditoría.
 *
 * Diseño:
 * - Cada log de auditoría (`audit`) tiene un `event` (categoría fija) y un
 *   `payload` (datos relevantes), serializado como JSON en una sola línea.
 *   Esto facilita buscar/filtrar logs en el dashboard de Render por evento
 *   (ej. grep "MEASUREMENT_CREATED") sin necesidad de un sistema externo.
 * - Los logs nunca incluyen el contenido de variables de entorno ni
 *   credenciales; solo datos de dominio (mediciones, bloques, alertas).
 */

type AuditEvent =
  | "MEASUREMENT_CREATED"
  | "BLOCK_CREATED"
  | "ANOMALY_DETECTED"
  | "ALERT_CREATED"
  | "BLOCKCHAIN_VERIFIED"
  | "BLOCKCHAIN_INTEGRITY_VIOLATION"
  | "SIMULATOR_STARTED"
  | "SIMULATOR_STOPPED"
  | "SOCKET_CLIENT_CONNECTED"
  | "SOCKET_CLIENT_DISCONNECTED";

const timestamp = () => new Date().toISOString();

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) =>
    console.log(`[${timestamp()}] [INFO] ${msg}`, meta ? JSON.stringify(meta) : ""),

  warn: (msg: string, meta?: Record<string, unknown>) =>
    console.warn(`[${timestamp()}] [WARN] ${msg}`, meta ? JSON.stringify(meta) : ""),

  error: (msg: string, meta?: Record<string, unknown>) =>
    console.error(`[${timestamp()}] [ERROR] ${msg}`, meta ? JSON.stringify(meta) : ""),

  /**
   * Log de auditoría: usar para todo evento de negocio relevante
   * (mediciones, bloques, alertas, verificación de cadena, simulador, sockets).
   */
  audit: (event: AuditEvent, payload: Record<string, unknown> = {}): void => {
    console.log(
      JSON.stringify({
        type: "AUDIT",
        event,
        timestamp: timestamp(),
        ...payload,
      })
    );
  },
};
