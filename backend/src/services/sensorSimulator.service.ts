import { MeasurementService } from "./measurement.service";
import { logger } from "../utils/logger";

const SENSOR_IDS = ["SENSOR-DGI-01", "SENSOR-DGI-02", "SENSOR-DGI-03"];

// Rangos normales según especificación del MVP
const NORMAL_FLOW_MIN = 50;
const NORMAL_FLOW_MAX = 150;
const NORMAL_LEVEL_MIN = 20;
const NORMAL_LEVEL_MAX = 80;

function randomInRange(min: number, max: number): number {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function pickSensorId(): string {
  return SENSOR_IDS[Math.floor(Math.random() * SENSOR_IDS.length)];
}

type AnomalyKind = "HIGH_FLOW" | "LOW_FLOW" | "HIGH_LEVEL" | null;

function rollAnomaly(probability: number): AnomalyKind {
  if (Math.random() > probability) return null;
  const kinds: AnomalyKind[] = ["HIGH_FLOW", "LOW_FLOW", "HIGH_LEVEL"];
  return kinds[Math.floor(Math.random() * kinds.length)];
}

/**
 * Genera una lectura simulada. La mayoría de las veces los valores caen dentro
 * de rangos normales; ocasionalmente se fuerza una anomalía para poder demostrar
 * el sistema de alertas durante la demo.
 */
function generateReading(anomalyProbability: number): {
  sensorId: string;
  flowRate: number;
  waterLevel: number;
  isAnomaly: boolean;
} {
  const anomaly = rollAnomaly(anomalyProbability);
  const sensorId = pickSensorId();

  let flowRate = randomInRange(NORMAL_FLOW_MIN, NORMAL_FLOW_MAX);
  let waterLevel = randomInRange(NORMAL_LEVEL_MIN, NORMAL_LEVEL_MAX);

  switch (anomaly) {
    case "HIGH_FLOW":
      flowRate = randomInRange(141, 200); // muy por encima del umbral de alerta (140)
      break;
    case "LOW_FLOW":
      flowRate = randomInRange(5, 59); // muy por debajo del umbral de alerta (60)
      break;
    case "HIGH_LEVEL":
      waterLevel = randomInRange(76, 120); // muy por encima del umbral de alerta (75)
      break;
    default:
      break;
  }

  return { sensorId, flowRate, waterLevel, isAnomaly: anomaly !== null };
}

class SensorSimulatorClass {
  private intervalHandle: NodeJS.Timeout | null = null;
  private running = false;

  isRunning(): boolean {
    return this.running;
  }

  start(intervalMs = 5000, anomalyProbability = 0.15): void {
    if (this.running) {
      logger.warn("El simulador ya está en ejecución. Ignorando solicitud de start().");
      return;
    }

    this.running = true;
    logger.audit("SIMULATOR_STARTED", { intervalMs, anomalyProbability });

    this.intervalHandle = setInterval(async () => {
      try {
        const reading = generateReading(anomalyProbability);
        await MeasurementService.register(reading);
      } catch (err) {
        logger.error("Error generando/registrando medición simulada:", err);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.running = false;
    logger.audit("SIMULATOR_STOPPED", {});
  }
}

export const SensorSimulator = new SensorSimulatorClass();
