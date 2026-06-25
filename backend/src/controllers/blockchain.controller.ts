import { Request, Response } from "express";
import { BlockchainService } from "../services/blockchain.service";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { LimitQuery } from "../validators/query.validators";
import { TraceParams } from "../validators/blockchain.validators";

export const BlockchainController = {
  getChain: asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as unknown as LimitQuery;
    const blocks = await BlockchainService.getChain(limit);
    res.json({ data: blocks });
  }),

  /**
   * Endpoint de verificación de integridad de la blockchain.
   * Recorre la cadena completa, recalcula cada hash (incluyendo el dataHash
   * contra la medición real almacenada) y reporta si la cadena es válida, en
   * qué bloque se rompió y por qué razón puntual. La auditoría del resultado
   * ocurre dentro de BlockchainService.verifyChain(), no acá, para no
   * duplicar el log cuando este método se invoque desde otros lugares
   * (ej. al iniciar el servidor).
   */
  getStatus: asyncHandler(async (req: Request, res: Response) => {
    const [verification, lastBlock] = await Promise.all([
      BlockchainService.verifyChain(),
      BlockchainService.getLastBlock(),
    ]);

    res.json({
      data: {
        valid: verification.valid,
        brokenAtIndex: verification.brokenAtIndex,
        reason: verification.reason,
        totalBlocks: verification.totalBlocksChecked,
        lastHash: lastBlock?.hash ?? BlockchainService.GENESIS_HASH,
        lastBlockTimestamp: lastBlock?.timestamp ?? null,
      },
    });
  }),

  /**
   * Trazabilidad: dado el id de una medición, devuelve el bloque que la
   * ancla junto con el resultado de verificar puntualmente ese bloque.
   * Pensado para la demo: tomar cualquier fila de la tabla de mediciones del
   * dashboard y mostrar su evidencia exacta en la blockchain.
   */
  traceMeasurement: asyncHandler(async (req: Request, res: Response) => {
    const { measurementId } = req.params as unknown as TraceParams;

    const trace = await BlockchainService.traceMeasurement(measurementId);
    if (!trace) {
      throw new AppError(`No se encontró una medición o bloque asociado para el id ${measurementId}.`, 404);
    }

    res.json({ data: trace });
  }),
};
