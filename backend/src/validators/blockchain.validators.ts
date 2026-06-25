import { z } from "zod";

/**
 * Valida el path param `measurementId` usado en el endpoint de trazabilidad
 * (GET /api/blockchain/trace/:measurementId). Se acota a enteros positivos
 * razonables para evitar consultas con valores absurdos o no numéricos.
 */
export const traceParamsSchema = z.object({
  measurementId: z.coerce.number().int().positive().max(2_147_483_647),
});

export type TraceParams = z.infer<typeof traceParamsSchema>;
