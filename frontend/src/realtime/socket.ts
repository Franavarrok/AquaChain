import { io, Socket } from "socket.io-client";

/**
 * URL del servidor de Socket.io. Reutiliza la misma base que la API REST
 * (quitándole el segmento "/api", ya que Socket.io se adjunta a la raíz del
 * servidor HTTP, no bajo /api). Configurable vía VITE_API_URL al igual que
 * el cliente REST, para no mantener dos variables de entorno apuntando al
 * mismo backend.
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, "");

let socketInstance: Socket | null = null;

/**
 * Devuelve la instancia singleton del socket, creándola en el primer uso.
 * `autoConnect: true` (default) hace que se conecte apenas se crea; el
 * componente que la use debe encargarse de los listeners de cada evento de
 * dominio y de limpiar (`socket.off(...)`) al desmontarse.
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socketInstance;
}

export const SOCKET_EVENTS = {
  MEASUREMENT_NEW: "measurement:new",
  BLOCK_NEW: "block:new",
  ALERT_NEW: "alert:new",
  BLOCKCHAIN_STATUS: "blockchain:status",
} as const;
