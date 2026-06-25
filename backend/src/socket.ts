import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { config } from "./config/env";
import { logger } from "./utils/logger";

/**
 * Eventos emitidos por el servidor hacia los clientes.
 * Mantener este objeto como única fuente de verdad de los nombres de evento
 * evita typos entre `realtime.service.ts` (quien emite) y el frontend
 * (quien escucha).
 */
export const SOCKET_EVENTS = {
  MEASUREMENT_NEW: "measurement:new",
  BLOCK_NEW: "block:new",
  ALERT_NEW: "alert:new",
  BLOCKCHAIN_STATUS: "blockchain:status",
} as const;

let ioInstance: SocketIOServer | null = null;

/**
 * Crea y adjunta el servidor de Socket.io al servidor HTTP existente.
 * Debe llamarse una sola vez, en el bootstrap de server.ts, después de crear
 * `httpServer` y antes de `httpServer.listen()`.
 *
 * Seguridad: el CORS de Socket.io reutiliza exactamente la misma whitelist
 * que la API REST (`config.corsAllowedOrigins`) — no se mantiene una lista
 * de orígenes separada que pueda desincronizarse de la de Express.
 */
export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  if (ioInstance) {
    throw new Error("El servidor de Socket.io ya fue inicializado. initSocketServer() debe llamarse una sola vez.");
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.corsAllowedOrigins,
      methods: ["GET"],
    },
    // El cliente solo necesita recibir eventos (broadcast de solo lectura);
    // no hay namespaces ni rooms adicionales para este MVP.
  });

  io.on("connection", (socket) => {
    logger.audit("SOCKET_CLIENT_CONNECTED", { socketId: socket.id });

    socket.on("disconnect", (reason) => {
      logger.audit("SOCKET_CLIENT_DISCONNECTED", { socketId: socket.id, reason });
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Devuelve la instancia activa de Socket.io. Lanza si se llama antes de
 * `initSocketServer()` — esto es intencional: preferimos un error explícito
 * al bootear mal el orden de inicialización, en lugar de emitir eventos al
 * vacío silenciosamente.
 */
export function getSocketServer(): SocketIOServer {
  if (!ioInstance) {
    throw new Error(
      "Socket.io no fue inicializado todavía. Llamá a initSocketServer() antes de usar getSocketServer()."
    );
  }
  return ioInstance;
}

/** Solo para tests/reinicios controlados; no se usa en el flujo normal. */
export function resetSocketServerForTests(): void {
  ioInstance = null;
}
