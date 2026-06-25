import { MeasurementModel } from "../models/measurement.model";
import { Measurement } from "../types";
import { NewMeasurementInput } from "../validators/measurement.validators";
import { BlockchainService } from "./blockchain.service";
import { AlertService } from "./alert.service";
import { logger } from "../utils/logger";

export const MeasurementService = {
  /**
   * Punto de entrada único para registrar una medición nueva (venga del simulador
   * o de un endpoint manual). Garantiza que toda medición:
   * 1. Se persiste.
   * 2. Se evalúa para alertas.
   * 3. Se ancla a la blockchain en un nuevo bloque.
   */
  async register(input: NewMeasurementInput): Promise<{
    measurement: Measurement;
    block: Awaited<ReturnType<typeof BlockchainService.addBlock>>;
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

    const alerts = await AlertService.evaluate(measurement);
    const block = await BlockchainService.addBlock(measurement);

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
