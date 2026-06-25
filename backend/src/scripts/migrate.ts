import fs from "fs";
import path from "path";
import { pool, waitForDatabase } from "../db/pool";
import { logger } from "../utils/logger";

/**
 * Aplica src/db/schema.sql contra la base de datos apuntada por DATABASE_URL.
 * Pensado como alternativa a `psql -f schema.sql` para quienes no tienen
 * `psql` instalado/en el PATH (caso típico en Windows). Usa el mismo pool de
 * `pg` que ya está configurado con SSL para Neon, así que no requiere ninguna
 * herramienta externa: alcanza con `npm run db:migrate`.
 *
 * El script es seguro de ejecutar más de una vez: todas las sentencias usan
 * `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`.
 */
async function migrate(): Promise<void> {
  await waitForDatabase();

  const schemaPath = path.join(__dirname, "..", "db", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf-8");

  logger.info(`Aplicando esquema desde ${schemaPath}...`);
  await pool.query(schemaSql);
  logger.info("Esquema aplicado correctamente: measurements, blocks y alerts ya existen (o ya existían).");

  await pool.end();
}

migrate().catch((err) => {
  logger.error("Error aplicando el esquema de base de datos", {
    message: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
