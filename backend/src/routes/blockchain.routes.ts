import { Router } from "express";
import { BlockchainController } from "../controllers/blockchain.controller";
import { validateQuery, validateParams } from "../middlewares/validate";
import { limitQuerySchema } from "../validators/query.validators";
import { traceParamsSchema } from "../validators/blockchain.validators";

const router = Router();

router.get("/", validateQuery(limitQuerySchema), BlockchainController.getChain);
router.get("/status", BlockchainController.getStatus);

/**
 * Trazabilidad medición → bloque. Debe declararse después de "/status" para
 * que Express no intente interpretar "status" como un :measurementId.
 */
router.get("/trace/:measurementId", validateParams(traceParamsSchema), BlockchainController.traceMeasurement);

export default router;
