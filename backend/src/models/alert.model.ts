import { pool } from "../db/pool";
import { Alert, AlertType } from "../types";

interface AlertRow {
  id: number;
  measurement_id: number;
  type: AlertType;
  message: string;
  value: string;
  timestamp: Date;
}

function mapRow(row: AlertRow): Alert {
  return {
    id: row.id,
    measurementId: row.measurement_id,
    type: row.type,
    message: row.message,
    value: Number(row.value),
    timestamp: row.timestamp.toISOString(),
  };
}

export const AlertModel = {
  async create(params: {
    measurementId: number;
    type: AlertType;
    message: string;
    value: number;
  }): Promise<Alert> {
    const { measurementId, type, message, value } = params;
    const result = await pool.query<AlertRow>(
      `INSERT INTO alerts (measurement_id, type, message, value)
       VALUES ($1, $2, $3, $4)
       RETURNING id, measurement_id, type, message, value, "timestamp"`,
      [measurementId, type, message, value]
    );
    return mapRow(result.rows[0]);
  },

  async findLatest(limit = 20): Promise<Alert[]> {
    const result = await pool.query<AlertRow>(
      `SELECT id, measurement_id, type, message, value, "timestamp"
       FROM alerts
       ORDER BY "timestamp" DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(mapRow);
  },

  async count(): Promise<number> {
    const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM alerts`);
    return Number(result.rows[0].count);
  },
};
