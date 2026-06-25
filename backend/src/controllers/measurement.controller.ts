import { Request, Response } from "express";
import { MeasurementService } from "../services/measurement.service";
import { asyncHandler } from "../utils/asyncHandler";
import { LimitQuery, ChartQuery } from "../validators/query.validators";

/**
 * Controller de solo lectura. La creación de mediciones ocurre exclusivamente
 * dentro de SensorSimulator (proceso interno del backend) y nunca a través
 * de un endpoint HTTP, por lo que este controller no expone ningún método
 * de escritura.
 */
export const MeasurementController = {
  getLatest: asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as unknown as LimitQuery;
    const measurements = await MeasurementService.getLatest(limit);
    res.json({ data: measurements });
  }),

  getForChart: asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as unknown as ChartQuery;
    const measurements = await MeasurementService.getForChart(limit);
    res.json({ data: measurements });
  }),
};
