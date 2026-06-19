import { z } from "zod";

/**
 * Aunque las mediciones se generan internamente (solo SensorSimulator escribe
 * en la base de datos, no hay endpoint público de creación), validamos igual
 * los datos antes de persistirlos. Esto es defensa en profundidad: protege
 * contra bugs futuros en el simulador y documenta explícitamente los rangos
 * físicamente válidos del dominio (nadie debería poder insertar un caudal
 * negativo o un sensorId vacío, ni siquiera por error de programación).
 */
export const newMeasurementSchema = z.object({
  sensorId: z
    .string()
    .trim()
    .min(1, "sensorId no puede estar vacío")
    .max(50, "sensorId demasiado largo")
    .regex(/^[A-Za-z0-9\-_]+$/, "sensorId contiene caracteres no permitidos"),
  flowRate: z
    .number()
    .finite()
    .min(0, "flowRate no puede ser negativo")
    .max(1000, "flowRate fuera de rango físico plausible"),
  waterLevel: z
    .number()
    .finite()
    .min(0, "waterLevel no puede ser negativo")
    .max(1000, "waterLevel fuera de rango físico plausible"),
  isAnomaly: z.boolean().optional().default(false),
});

export type NewMeasurementInput = z.infer<typeof newMeasurementSchema>;
