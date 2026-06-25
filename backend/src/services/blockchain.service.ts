import crypto from "crypto";
import { BlockModel } from "../models/block.model";
import { MeasurementModel } from "../models/measurement.model";
import { Block, Measurement } from "../types";
import { logger } from "../utils/logger";

const GENESIS_HASH = "0".repeat(64);

/**
 * Calcula el hash SHA-256 de los datos de una medición + el hash anterior.
 * Esto es lo que garantiza el encadenamiento: si alguien altera una medición
 * pasada, el dataHash recalculado a partir de esa medición cambia, y por lo
 * tanto el hash del bloque también, rompiendo la cadena hacia adelante.
 */
function computeDataHash(
  measurement: Pick<Measurement, "sensorId" | "flowRate" | "waterLevel" | "timestamp">,
  previousHash: string
): string {
  const payload = JSON.stringify({
    sensorId: measurement.sensorId,
    flowRate: measurement.flowRate,
    waterLevel: measurement.waterLevel,
    timestamp: measurement.timestamp,
    previousHash,
  });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

/**
 * El hash final del bloque combina index + dataHash + previousHash,
 * similar a como Bitcoin combina header fields antes de hashear.
 */
function computeBlockHash(index: number, dataHash: string, previousHash: string): string {
  const payload = `${index}:${dataHash}:${previousHash}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export type IntegrityFailureReason =
  | "PREVIOUS_HASH_MISMATCH" // el previousHash de este bloque no coincide con el hash del bloque anterior
  | "BLOCK_HASH_MISMATCH" // el hash almacenado no corresponde a index+dataHash+previousHash
  | "DATA_HASH_MISMATCH" // el dataHash almacenado no corresponde a la medición real en la tabla measurements
  | "MEASUREMENT_NOT_FOUND"; // el bloque referencia una medición que ya no existe

export interface VerificationResult {
  valid: boolean;
  brokenAtIndex: number | null;
  reason: IntegrityFailureReason | null;
  totalBlocksChecked: number;
}

export interface TraceResult {
  measurement: Measurement;
  block: Block;
  blockIntegrity: {
    valid: boolean;
    reason: IntegrityFailureReason | null;
  };
}

export const BlockchainService = {
  GENESIS_HASH,

  /**
   * Crea y persiste un nuevo bloque encadenado al último bloque existente.
   * Se llama automáticamente cada vez que se registra una nueva medición
   * (desde MeasurementService, nunca directamente desde un endpoint HTTP).
   *
   * Además de crear el bloque, devuelve un VerificationResult "optimista":
   * como el bloque se acaba de construir a partir del hash real del bloque
   * anterior, sabemos que esta escritura puntual es válida sin necesidad de
   * recorrer toda la cadena otra vez (eso sería redundante y costoso si se
   * hiciera en cada tick del simulador). Este resultado optimista es el que
   * se emite por Socket.io para mantener el indicador de estado de la
   * blockchain actualizado en tiempo real en el dashboard; la verificación
   * exhaustiva de toda la cadena sigue existiendo en `verifyChain()` y es la
   * que se usa en `/api/blockchain/status` y al iniciar el servidor.
   */
  async addBlock(measurement: Measurement): Promise<{ block: Block; optimisticStatus: VerificationResult }> {
    const lastBlock = await BlockModel.findLast();
    const previousHash = lastBlock ? lastBlock.hash : GENESIS_HASH;
    const nextIndex = lastBlock ? lastBlock.index + 1 : 0;

    const dataHash = computeDataHash(measurement, previousHash);
    const hash = computeBlockHash(nextIndex, dataHash, previousHash);

    const block = await BlockModel.create({
      measurementId: measurement.id,
      previousHash,
      hash,
      dataHash,
    });

    logger.audit("BLOCK_CREATED", {
      index: block.index,
      hash: block.hash,
      previousHash: block.previousHash,
      measurementId: block.measurementId,
    });

    const optimisticStatus: VerificationResult = {
      valid: true,
      brokenAtIndex: null,
      reason: null,
      totalBlocksChecked: block.index + 1,
    };

    return { block, optimisticStatus };
  },

  /**
   * Verifica la integridad de UN bloque en particular contra:
   * 1. El hash esperado del bloque anterior (encadenamiento).
   * 2. El hash recalculado a partir de su propio (index, dataHash, previousHash).
   * 3. El dataHash recalculado a partir de la medición REAL provista — este es
   *    el chequeo que cierra el hueco de que alguien edite measurements y
   *    blocks de forma "consistente entre sí" pero distinta del momento
   *    original de creación.
   *
   * Recibe la medición ya resuelta (en lugar de buscarla por su cuenta) para
   * que quien orquesta la verificación (verifyChain, traceMeasurement) decida
   * cómo obtenerla — por ejemplo, en batch para toda la cadena, o con un
   * único lookup puntual para un solo bloque.
   */
  verifyBlock(
    block: Block,
    expectedPreviousHash: string,
    measurement: Measurement | null
  ): { valid: boolean; reason: IntegrityFailureReason | null } {
    if (block.previousHash !== expectedPreviousHash) {
      return { valid: false, reason: "PREVIOUS_HASH_MISMATCH" };
    }

    const recomputedBlockHash = computeBlockHash(block.index, block.dataHash, block.previousHash);
    if (recomputedBlockHash !== block.hash) {
      return { valid: false, reason: "BLOCK_HASH_MISMATCH" };
    }

    if (!measurement) {
      return { valid: false, reason: "MEASUREMENT_NOT_FOUND" };
    }

    const recomputedDataHash = computeDataHash(measurement, block.previousHash);
    if (recomputedDataHash !== block.dataHash) {
      return { valid: false, reason: "DATA_HASH_MISMATCH" };
    }

    return { valid: true, reason: null };
  },

  /**
   * Recorre toda la cadena de principio a fin y verifica cada bloque con
   * `verifyBlock`. Se detiene en el primer bloque inválido y reporta su
   * índice y la razón específica de la falla — esto es lo que se muestra en
   * el endpoint `/api/blockchain/status` y lo que permite, durante la demo,
   * alterar un registro a propósito y mostrar exactamente dónde el sistema
   * lo detecta.
   *
   * Optimización: en lugar de hacer un SELECT a `measurements` por cada
   * bloque (N consultas para N bloques), se traen todas las mediciones
   * referenciadas en una sola consulta batch (`findByIds`) y se verifican en
   * memoria. Esto es relevante porque este método se invoca en cada refresco
   * del dashboard (vía /api/dashboard/stats) y, sin el batch, escalaría mal
   * a medida que crece la cadena durante una demo larga.
   */
  async verifyChain(): Promise<VerificationResult> {
    const blocks = await BlockModel.findAllAscending();
    const measurementsById = await MeasurementModel.findByIds(blocks.map((b) => b.measurementId));

    let expectedPreviousHash = GENESIS_HASH;
    let checked = 0;

    for (const block of blocks) {
      const measurement = measurementsById.get(block.measurementId) ?? null;
      const result = BlockchainService.verifyBlock(block, expectedPreviousHash, measurement);
      checked += 1;

      if (!result.valid) {
        logger.audit("BLOCKCHAIN_INTEGRITY_VIOLATION", {
          brokenAtIndex: block.index,
          reason: result.reason,
          totalBlocksChecked: checked,
        });
        return { valid: false, brokenAtIndex: block.index, reason: result.reason, totalBlocksChecked: checked };
      }

      expectedPreviousHash = block.hash;
    }

    logger.audit("BLOCKCHAIN_VERIFIED", { totalBlocksChecked: checked });
    return { valid: true, brokenAtIndex: null, reason: null, totalBlocksChecked: checked };
  },

  /**
   * Trazabilidad: dado el id de una medición (la que se ve en el dashboard o
   * en la tabla de últimas mediciones), ubica el bloque que la ancla y
   * verifica puntualmente la integridad de ese bloque. Pensado para la demo:
   * "tomá cualquier medición y mostrame su evidencia en la blockchain".
   */
  async traceMeasurement(measurementId: number): Promise<TraceResult | null> {
    const measurement = await MeasurementModel.findById(measurementId);
    if (!measurement) return null;

    const block = await BlockModel.findByMeasurementId(measurementId);
    if (!block) return null;

    const previousBlock = block.index === 0 ? null : await BlockModel.findByIndex(block.index - 1);
    const expectedPreviousHash = previousBlock ? previousBlock.hash : GENESIS_HASH;

    const integrity = BlockchainService.verifyBlock(block, expectedPreviousHash, measurement);

    return { measurement, block, blockIntegrity: integrity };
  },

  async getChain(limit = 100): Promise<Block[]> {
    return BlockModel.findAll(limit);
  },

  async getLastBlock(): Promise<Block | null> {
    return BlockModel.findLast();
  },

  async getChainLength(): Promise<number> {
    return BlockModel.count();
  },
};
