import { Request, Response } from "express";
import { AlertService } from "../services/alert.service";
import { asyncHandler } from "../utils/asyncHandler";
import { LimitQuery } from "../validators/query.validators";

export const AlertController = {
  getLatest: asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as unknown as LimitQuery;
    const alerts = await AlertService.getLatest(limit);
    res.json({ data: alerts, thresholds: AlertService.getThresholds() });
  }),
};
