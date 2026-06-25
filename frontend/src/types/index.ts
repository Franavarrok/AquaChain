export interface Measurement {
  id: number;
  sensorId: string;
  flowRate: number;
  waterLevel: number;
  isAnomaly: boolean;
  timestamp: string;
}

export interface Block {
  index: number;
  measurementId: number;
  previousHash: string;
  hash: string;
  dataHash: string;
  timestamp: string;
}

export type AlertType = "HIGH_FLOW" | "LOW_FLOW" | "HIGH_LEVEL";

export interface Alert {
  id: number;
  measurementId: number;
  type: AlertType;
  message: string;
  value: number;
  timestamp: string;
}

export interface DashboardStats {
  totalMeasurements: number;
  totalAlerts: number;
  blockchainStatus: "VALID" | "INVALID";
  totalBlocks: number;
  lastUpdate: string | null;
}

export type IntegrityFailureReason =
  | "PREVIOUS_HASH_MISMATCH"
  | "BLOCK_HASH_MISMATCH"
  | "DATA_HASH_MISMATCH"
  | "MEASUREMENT_NOT_FOUND";

/** Forma devuelta por GET /api/blockchain/status (snapshot inicial vía REST). */
export interface BlockchainStatusResponse {
  valid: boolean;
  brokenAtIndex: number | null;
  reason: IntegrityFailureReason | null;
  totalBlocks: number;
  lastHash: string;
  lastBlockTimestamp: string | null;
}

/**
 * Forma emitida por el evento de socket "blockchain:status". Es el
 * VerificationResult "optimista" que el backend construye en el momento de
 * crear cada bloque (ver BlockchainService.addBlock), por eso usa
 * `totalBlocksChecked` en lugar de `totalBlocks` y no incluye `lastHash`.
 * El dashboard combina ambas formas en un solo estado en memoria.
 */
export interface BlockchainStatusEvent {
  valid: boolean;
  brokenAtIndex: number | null;
  reason: IntegrityFailureReason | null;
  totalBlocksChecked: number;
}

export interface AlertThresholds {
  FLOW_HIGH: number;
  FLOW_LOW: number;
  LEVEL_HIGH: number;
}
