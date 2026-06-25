import { Router } from "express";
import { BlockchainController } from "../controllers/blockchain.controller";
import { validateQuery } from "../middlewares/validate";
import { limitQuerySchema } from "../validators/query.validators";

const router = Router();

router.get("/", validateQuery(limitQuerySchema), BlockchainController.getChain);
router.get("/status", BlockchainController.getStatus);

export default router;
