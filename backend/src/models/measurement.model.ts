import { pool } from "../db/pool";
import { Measurement } from "../types";
import { NewMeasurementInput } from "../validators/measurement.validators";

interface MeasurementRow {
  id: number;
  sensor_id: string;
  flow_rate: string;
  water_level: string;
  is_anomaly: boolean;
  timestamp: Date;
}

function mapRow(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    sensorId: row.sensor_id,
    flowRate: Number(row.flow_rate),
    waterLevel: Number(row.water_level),
    isAnomaly: row.is_anomaly,
    timestamp: row.timestamp.toISOString(),
  };
}

export const MeasurementModel = {
  async create(input: NewMeasurementInput): Promise<Measurement> {
    const { sensorId, flowRate, waterLevel, isAnomaly = false } = input;
    const result = await pool.query<MeasurementRow>(
      `INSERT INTO measurements (sensor_id, flow_rate, water_level, is_anomaly)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sensor_id, flow_rate, water_level, is_anomaly, "timestamp"`,
      [sensorId, flowRate, waterLevel, isAnomaly]
    );
    return mapRow(result.rows[0]);
  },

  async findById(id: number): Promise<Measurement | null> {
    const result = await pool.query<MeasurementRow>(
      `SELECT id, sensor_id, flow_rate, water_level, is_anomaly, "timestamp"
       FROM measurements WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  },

  /**
   * Trae varias mediciones por id en una sola consulta. Se usa en
   * BlockchainService.verifyChain() para evitar hacer un SELECT por bloque
   * (N consultas) cuando se verifica la cadena completa: en su lugar, se
   * piden todas las mediciones referenciadas de una vez y se indexan en
   * memoria por id.
   */
  async findByIds(ids: number[]): Promise<Map<number, Measurement>> {
    if (ids.length === 0) return new Map();
    const uniqueIds = Array.from(new Set(ids));
    const result = await pool.query<MeasurementRow>(
      `SELECT id, sensor_id, flow_rate, water_level, is_anomaly, "timestamp"
       FROM measurements WHERE id = ANY($1::int[])`,
      [uniqueIds]
    );
    const map = new Map<number, Measurement>();
    for (const row of result.rows) {
      const measurement = mapRow(row);
      map.set(measurement.id, measurement);
    }
    return map;
  },

  async findLatest(limit = 20): Promise<Measurement[]> {
    const result = await pool.query<MeasurementRow>(
      `SELECT id, sensor_id, flow_rate, water_level, is_anomaly, "timestamp"
       FROM measurements
       ORDER BY "timestamp" DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(mapRow);
  },

  async findForChart(limit = 50): Promise<Measurement[]> {
    const result = await pool.query<MeasurementRow>(
      `SELECT id, sensor_id, flow_rate, water_level, is_anomaly, "timestamp"
       FROM measurements
       ORDER BY "timestamp" DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(mapRow).reverse(); // orden cronológico ascendente para graficar
  },

  async count(): Promise<number> {
    const result = await pool.query<{ count: string }>(`SELECT COUNT(*)::text as count FROM measurements`);
    return Number(result.rows[0].count);
  },
};
