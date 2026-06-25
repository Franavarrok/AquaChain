import http from "http";

import { createApp } from "./app";
import { config } from "./config/env";
import { waitForDatabase } from "./db/pool";
import { BlockchainService } from "./services/blockchain.service";
import { SensorSimulator } from "./services/sensorSimulator.service";
import { logger } from "./utils/logger";

/**
 * NOTA: este archivo usa `http.createServer(app)` en lugar de `app.listen()`
 * directo a propósito. Esto deja el server HTTP "crudo" disponible para que,
 * en la etapa de Socket.io, se pueda adjuntar `new Server(httpServer, ...)`
 * sin reestructurar el bootstrap. Por ahora no hay sockets todavía: solo
 * REST sobre este mismo servidor HTTP.
 */
async function bootstrap(): Promise<void> {
  await waitForDatabase();

  // Verificación de integridad de la blockchain al iniciar la aplicación.
  // Si la cadena ya tiene bloques (ej. tras un redeploy en Render) y alguno
  // fue alterado externamente, queremos saberlo apenas el proceso arranca.
  // NOTA: BlockchainService.verifyChain() ya audita internamente el resultado
  // (BLOCKCHAIN_VERIFIED / BLOCKCHAIN_INTEGRITY_VIOLATION); acá solo se agrega
  // un log legible adicional si la cadena resultó inválida, sin duplicar el
  // evento de auditoría.
  const verification = await BlockchainService.verifyChain();
  if (!verification.valid) {
    logger.warn("La blockchain existente presenta una violación de integridad detectada al iniciar.", {
      brokenAtIndex: verification.brokenAtIndex,
      reason: verification.reason,
    });
  }

  const app = createApp();
  const httpServer = http.createServer(app);

  // TODO (etapa Socket.io): adjuntar `new Server(httpServer, { cors: ... })`
  // aquí mismo, antes de httpServer.listen(...).

  httpServer.listen(config.port, () => {
    logger.info(`🌊 AquaCHAIN backend escuchando en el puerto ${config.port}`, { env: config.nodeEnv });
    logger.info("Health check disponible en /health");

    // El simulador es la única fuente de escritura del sistema (ver
    // requisitos de seguridad de API). Arranca automáticamente según
    // SENSOR_AUTOSTART; en caso de necesitar pausarlo durante una demo,
    // hoy la única forma es deteniendo el proceso o cambiando esa variable
    // y reiniciando — no existe un endpoint HTTP para controlarlo.
    if (config.sensor.autostart) {
      SensorSimulator.start(config.sensor.intervalMs, config.sensor.anomalyProbability);
    } else {
      logger.info("SENSOR_AUTOSTART=false — el simulador no se inició automáticamente.");
    }
  });
}

bootstrap().catch((err) => {
  logger.error("Error fatal al iniciar el servidor", {
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
