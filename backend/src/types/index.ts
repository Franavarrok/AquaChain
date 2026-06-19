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

export interface NewMeasurementInput {
  sensorId: string;
  flowRate: number;
  waterLevel: number;
  isAnomaly?: boolean;
}

export interface DashboardStats {
  totalMeasurements: number;
  totalAlerts: number;
  blockchainStatus: "VALID" | "INVALID";
  totalBlocks: number;
  lastUpdate: string | null;
}
