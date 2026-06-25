import { Router } from "express";
import { MeasurementController } from "../controllers/measurement.controller";
import { validateQuery } from "../middlewares/validate";
import { limitQuerySchema, chartQuerySchema } from "../validators/query.validators";

const router = Router();

/**
 * Seguridad de API: estas son las ÚNICAS rutas expuestas para mediciones,
 * y ambas son de solo lectura (GET). No existe ningún endpoint público
 * para crear, modificar o eliminar mediciones — esa responsabilidad es
 * exclusiva del SensorSimulator, que llama directamente a
 * MeasurementService desde dentro del proceso del backend, sin pasar
 * por la capa HTTP.
 */
router.get("/", validateQuery(limitQuerySchema), MeasurementController.getLatest);
router.get("/chart", validateQuery(chartQuerySchema), MeasurementController.getForChart);

export default router;
