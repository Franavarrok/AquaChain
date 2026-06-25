import { pool } from "../db/pool";
import { Block } from "../types";

interface BlockRow {
  index: number;
  measurement_id: number;
  previous_hash: string;
  hash: string;
  data_hash: string;
  timestamp: Date;
}

function mapRow(row: BlockRow): Block {
  return {
    index: row.index,
    measurementId: row.measurement_id,
    previousHash: row.previous_hash,
    hash: row.hash,
    dataHash: row.data_hash,
    timestamp: row.timestamp.toISOString(),
  };
}

export const BlockModel = {
  async create(params: {
    measurementId: number;
    previousHash: string;
    hash: string;
    dataHash: string;
  }): Promise<Block> {
    const { measurementId, previousHash, hash, dataHash } = params;
    const result = await pool.query<BlockRow>(
      `INSERT INTO blocks (measurement_id, previous_hash, hash, data_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING "index", measurement_id, previous_hash, hash, data_hash, "timestamp"`,
      [measurementId, previousHash, hash, dataHash]
    );
    return mapRow(result.rows[0]);
  },

  async findLast(): Promise<Block | null> {
    const result = await pool.query<BlockRow>(
      `SELECT "index", measurement_id, previous_hash, hash, data_hash, "timestamp"
       FROM blocks
       ORDER BY "index" DESC
       LIMIT 1`
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  /**
   * Busca el bloque que ancla una medición específica. Es la base de la
   * trazabilidad "medición → bloque": dado el id de una medición visible en
   * el dashboard, este método permite ubicar exactamente qué bloque de la
   * cadena la contiene, para luego mostrar su hash y verificar su integridad.
   */
  async findByMeasurementId(measurementId: number): Promise<Block | null> {
    const result = await pool.query<BlockRow>(
      `SELECT "index", measurement_id, previous_hash, hash, data_hash, "timestamp"
       FROM blocks
       WHERE measurement_id = $1
       LIMIT 1`,
      [measurementId]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  async findByIndex(index: number): Promise<Block | null> {
    const result = await pool.query<BlockRow>(
      `SELECT "index", measurement_id, previous_hash, hash, data_hash, "timestamp"
       FROM blocks
       WHERE "index" = $1
       LIMIT 1`,
      [index]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  async findAll(limit = 100): Promise<Block[]> {
    const result = await pool.query<BlockRow>(
      `SELECT "index", measurement_id, previous_hash, hash, data_hash, "timestamp"
       FROM blocks
       ORDER BY "index" DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(mapRow);
  },

  async findAllAscending(): Promise<Block[]> {
    const result = await pool.query<BlockRow>(
      `SELECT "index", measurement_id, previous_hash, hash, data_hash, "timestamp"
       FROM blocks
       ORDER BY "index" ASC`
    );
    return result.rows.map(mapRow);
  },

  async count(): Promise<number> {
    const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM blocks`);
    return Number(result.rows[0].count);
  },
};
