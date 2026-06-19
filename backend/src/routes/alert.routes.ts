import { Router } from "express";
import { AlertController } from "../controllers/alert.controller";
import { validateQuery } from "../middlewares/validate";
import { limitQuerySchema } from "../validators/query.validators";

const router = Router();

router.get("/", validateQuery(limitQuerySchema), AlertController.getLatest);

export default router;
