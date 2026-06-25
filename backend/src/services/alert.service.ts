import { AlertModel } from "../models/alert.model";
import { Alert, AlertType, Measurement } from "../types";
import { logger } from "../utils/logger";

// Umbrales definidos en los requerimientos del MVP
export const ALERT_THRESHOLDS = {
  FLOW_HIGH: 140,
  FLOW_LOW: 60,
  LEVEL_HIGH: 75,
};

export const AlertService = {
  /**
   * Evalúa una medición contra las reglas de negocio y genera alertas si corresponde.
   * Una misma medición puede generar más de una alerta (ej: caudal alto Y nivel crítico).
   */
  async evaluate(measurement: Measurement): Promise<Alert[]> {
    const generated: Alert[] = [];

    if (measurement.flowRate > ALERT_THRESHOLDS.FLOW_HIGH) {
      const alert = await AlertModel.create({
        measurementId: measurement.id,
        type: "HIGH_FLOW",
        message: `Caudal extremadamente alto detectado en ${measurement.sensorId}: ${measurement.flowRate} m³/s`,
        value: measurement.flowRate,
      });
      generated.push(alert);
    }

    if (measurement.flowRate < ALERT_THRESHOLDS.FLOW_LOW) {
      const alert = await AlertModel.create({
        measurementId: measurement.id,
        type: "LOW_FLOW",
        message: `Caudal anormalmente bajo detectado en ${measurement.sensorId}: ${measurement.flowRate} m³/s`,
        value: measurement.flowRate,
      });
      generated.push(alert);
    }

    if (measurement.waterLevel > ALERT_THRESHOLDS.LEVEL_HIGH) {
      const alert = await AlertModel.create({
        measurementId: measurement.id,
        type: "HIGH_LEVEL",
        message: `Nivel de agua crítico detectado en ${measurement.sensorId}: ${measurement.waterLevel} cm`,
        value: measurement.waterLevel,
      });
      generated.push(alert);
    }

    generated.forEach((a) =>
      logger.audit("ALERT_CREATED", { id: a.id, type: a.type, value: a.value, measurementId: a.measurementId })
    );

    return generated;
  },

  async getLatest(limit = 20): Promise<Alert[]> {
    return AlertModel.findLatest(limit);
  },

  async count(): Promise<number> {
    return AlertModel.count();
  },

  getThresholds(): typeof ALERT_THRESHOLDS {
    return ALERT_THRESHOLDS;
  },
};

export type { AlertType };
