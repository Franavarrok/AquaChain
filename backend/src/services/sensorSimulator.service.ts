import { MeasurementService } from "./measurement.service";
import { logger } from "../utils/logger";
import { newMeasurementSchema } from "../validators/measurement.validators";

/**
 * SensorSimulator
 *
 * Reemplaza a la red de sensores físicos que no existe en este MVP. Corre
 * exclusivamente DENTRO del proceso del backend (lo arranca server.ts al
 * bootear) y nunca se expone como endpoint HTTP: no hay ningún
 * POST /api/.../simulator/start ni equivalente. Esto es intencional —
 * ver el requisito de seguridad de API: la única vía de escritura del
 * sistema es este simulador llamando directamente a MeasurementService.
 */

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
  /**
   * Guard contra ejecuciones superpuestas: si un ciclo todavía está
   * persistiendo en la base de datos (ej. por un cold start de Neon) cuando
   * el timer dispara el siguiente, este flag evita que se acumulen escrituras
   * en paralelo, lo que podría desordenar el encadenamiento de bloques (dos
   * llamadas concurrentes a BlockchainService.addBlock podrían leer el mismo
   * "último bloque" antes de que la primera termine de insertar el suyo).
   */
  private tickInProgress = false;

  isRunning(): boolean {
    return this.running;
  }

  start(intervalMs: number, anomalyProbability: number): void {
    if (this.running) {
      logger.warn("El simulador ya está en ejecución. Ignorando solicitud de start().");
      return;
    }

    this.running = true;
    logger.audit("SIMULATOR_STARTED", { intervalMs, anomalyProbability });

    this.intervalHandle = setInterval(() => {
      void this.tick(anomalyProbability);
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

  /**
   * Ejecuta un ciclo de simulación: genera una lectura, la valida (defensa en
   * profundidad — ver measurement.validators.ts) y la registra a través de
   * MeasurementService, que se encarga de persistirla, evaluarla contra las
   * reglas de alerta y anclarla a la blockchain.
   */
  private async tick(anomalyProbability: number): Promise<void> {
    if (this.tickInProgress) {
      logger.warn("Ciclo de simulación anterior aún en curso; se omite este tick para evitar superposición.");
      return;
    }

    this.tickInProgress = true;
    try {
      const rawReading = generateReading(anomalyProbability);

      // Aunque el simulador es código interno propio, se valida igual antes
      // de tocar la base de datos: defensa en profundidad ante bugs futuros
      // en generateReading() (ver validators/measurement.validators.ts).
      const reading = newMeasurementSchema.parse(rawReading);

      await MeasurementService.register(reading);
    } catch (err) {
      logger.error("Error generando/registrando medición simulada", {
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      this.tickInProgress = false;
    }
  }
}

export const SensorSimulator = new SensorSimulatorClass();
