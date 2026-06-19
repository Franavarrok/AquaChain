import crypto from "crypto";
import { BlockModel } from "../models/block.model";
import { Block, Measurement } from "../types";
import { logger } from "../utils/logger";

const GENESIS_HASH = "0".repeat(64);

/**
 * Calcula el hash SHA-256 de los datos de una medición + el hash anterior.
 * Esto es lo que garantiza el encadenamiento: si alguien altera una medición
 * pasada, el data_hash cambia, y por lo tanto el hash del bloque también,
 * rompiendo la cadena hacia adelante.
 */
function computeDataHash(measurement: Measurement, previousHash: string): string {
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

export const BlockchainService = {
  GENESIS_HASH,

  /**
   * Crea y persiste un nuevo bloque encadenado al último bloque existente.
   * Se llama automáticamente cada vez que se registra una nueva medición.
   */
  async addBlock(measurement: Measurement): Promise<Block> {
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
    return block;
  },

  /**
   * Recorre toda la cadena y verifica que:
   * 1. El previousHash de cada bloque coincida con el hash del bloque anterior.
   * 2. El hash de cada bloque sea recalculable a partir de su propio contenido
   *    (detecta manipulación directa de la columna `hash` en la base de datos).
   */
  async verifyChain(): Promise<{ valid: boolean; brokenAtIndex: number | null }> {
    const blocks = await BlockModel.findAllAscending();

    let expectedPreviousHash = GENESIS_HASH;

    for (const block of blocks) {
      if (block.previousHash !== expectedPreviousHash) {
        return { valid: false, brokenAtIndex: block.index };
      }

      const recomputedHash = computeBlockHash(block.index, block.dataHash, block.previousHash);
      if (recomputedHash !== block.hash) {
        return { valid: false, brokenAtIndex: block.index };
      }

      expectedPreviousHash = block.hash;
    }

    return { valid: true, brokenAtIndex: null };
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
