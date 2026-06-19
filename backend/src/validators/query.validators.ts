import { z } from "zod";

/**
 * Esquema reutilizable para paginar/limitar resultados en endpoints de lectura.
 * - Coercionamos el string de query param a número.
 * - Acotamos el rango a valores razonables (1 a 200) para evitar que alguien
 *   pida `limit=999999999` y fuerce una consulta pesada contra la base de datos.
 */
export const limitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export const chartQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export type LimitQuery = z.infer<typeof limitQuerySchema>;
export type ChartQuery = z.infer<typeof chartQuerySchema>;
