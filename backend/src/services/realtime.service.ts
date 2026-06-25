import { getSocketServer, SOCKET_EVENTS } from "../socket";
import { Alert, Block, Measurement } from "../types";
import { VerificationResult } from "./blockchain.service";
import { logger } from "../utils/logger";

/**
 * RealtimeService
 *
 * Punto único por el que la capa de negocio (MeasurementService, AlertService,
 * BlockchainService) notifica al frontend que algo nuevo ocurrió. Ninguno de
 * esos servicios importa `socket.io` directamente — eso mantiene la lógica de
 * negocio independiente del mecanismo de transporte, y permite, por ejemplo,
 * que los tests de esos servicios no necesiten levantar un servidor de sockets.
 *
 * Si `getSocketServer()` lanza (porque Socket.io todavía no se inicializó,
 * algo que no debería pasar en el flujo normal de bootstrap), se loguea el
 * error pero NUNCA se interrumpe el flujo de negocio: una medición debe
 * poder guardarse y anclarse a la blockchain incluso si, por algún motivo,
 * la notificación en tiempo real falla.
 */
export const RealtimeService = {
  emitNewMeasurement(measurement: Measurement): void {
    RealtimeService.safeEmit(SOCKET_EVENTS.MEASUREMENT_NEW, measurement);
  },

  emitNewBlock(block: Block): void {
    RealtimeService.safeEmit(SOCKET_EVENTS.BLOCK_NEW, block);
  },

  emitNewAlert(alert: Alert): void {
    RealtimeService.safeEmit(SOCKET_EVENTS.ALERT_NEW, alert);
  },

  emitBlockchainStatus(status: VerificationResult): void {
    RealtimeService.safeEmit(SOCKET_EVENTS.BLOCKCHAIN_STATUS, status);
  },

  safeEmit(event: string, payload: unknown): void {
    try {
      const io = getSocketServer();
      io.emit(event, payload);
    } catch (err) {
      logger.error("No se pudo emitir evento en tiempo real", {
        event,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
