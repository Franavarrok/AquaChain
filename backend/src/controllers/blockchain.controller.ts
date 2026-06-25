import { Request, Response } from "express";
import { BlockchainService } from "../services/blockchain.service";
import { asyncHandler } from "../utils/asyncHandler";
import { LimitQuery } from "../validators/query.validators";
import { logger } from "../utils/logger";

export const BlockchainController = {
  getChain: asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as unknown as LimitQuery;
    const blocks = await BlockchainService.getChain(limit);
    res.json({ data: blocks });
  }),

  /**
   * Endpoint de verificación de integridad de la blockchain.
   * Recorre la cadena completa, recalcula los hashes y confirma que cada
   * bloque está correctamente encadenado al anterior. Se audita el resultado
   * de cada verificación, incluyendo si se detecta una violación de integridad.
   */
  getStatus: asyncHandler(async (req: Request, res: Response) => {
    const [verification, lastBlock, length] = await Promise.all([
      BlockchainService.verifyChain(),
      BlockchainService.getLastBlock(),
      BlockchainService.getChainLength(),
    ]);

    if (verification.valid) {
      logger.audit("BLOCKCHAIN_VERIFIED", { totalBlocks: length });
    } else {
      logger.audit("BLOCKCHAIN_INTEGRITY_VIOLATION", { brokenAtIndex: verification.brokenAtIndex });
    }

    res.json({
      data: {
        valid: verification.valid,
        brokenAtIndex: verification.brokenAtIndex,
        totalBlocks: length,
        lastHash: lastBlock?.hash ?? BlockchainService.GENESIS_HASH,
        lastBlockTimestamp: lastBlock?.timestamp ?? null,
      },
    });
  }),
};
