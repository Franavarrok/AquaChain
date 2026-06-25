import { MeasurementModel } from "../models/measurement.model";
import { Measurement } from "../types";
import { NewMeasurementInput } from "../validators/measurement.validators";
import { BlockchainService } from "./blockchain.service";
import { AlertService } from "./alert.service";
import { RealtimeService } from "./realtime.service";
import { logger } from "../utils/logger";

export const MeasurementService = {
  /**
   * Punto de entrada único para registrar una medición nueva (la llama
   * exclusivamente SensorSimulator). Garantiza que toda medición:
   * 1. Se persiste.
   * 2. Se evalúa para alertas.
   * 3. Se ancla a la blockchain en un nuevo bloque.
   * 4. Se emite por Socket.io al frontend, en ese mismo orden: primero la
   *    medición cruda, luego cada alerta generada, y finalmente el bloque ya
   *    encadenado — así el dashboard puede actualizar la tabla de mediciones,
   *    el panel de alertas y el Blockchain Explorer en una secuencia que
   *    refleja el flujo real de datos.
   */
  async register(input: NewMeasurementInput): Promise<{
    measurement: Measurement;
    block: Awaited<ReturnType<typeof BlockchainService.addBlock>>["block"];
    alerts: Awaited<ReturnType<typeof AlertService.evaluate>>;
  }> {
    const measurement = await MeasurementModel.create(input);
    logger.audit("MEASUREMENT_CREATED", {
      id: measurement.id,
      sensorId: measurement.sensorId,
      flowRate: measurement.flowRate,
      waterLevel: measurement.waterLevel,
      isAnomaly: measurement.isAnomaly,
    });
    RealtimeService.emitNewMeasurement(measurement);

    const alerts = await AlertService.evaluate(measurement);
    alerts.forEach((alert) => RealtimeService.emitNewAlert(alert));

    const { block, optimisticStatus } = await BlockchainService.addBlock(measurement);
    RealtimeService.emitNewBlock(block);
    RealtimeService.emitBlockchainStatus(optimisticStatus);

    return { measurement, block, alerts };
  },

  async getLatest(limit = 20): Promise<Measurement[]> {
    return MeasurementModel.findLatest(limit);
  },

  async getForChart(limit = 50): Promise<Measurement[]> {
    return MeasurementModel.findForChart(limit);
  },

  async count(): Promise<number> {
    return MeasurementModel.count();
  },
};
