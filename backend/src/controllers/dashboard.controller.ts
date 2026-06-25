import { Request, Response } from "express";
import { MeasurementService } from "../services/measurement.service";
import { AlertService } from "../services/alert.service";
import { BlockchainService } from "../services/blockchain.service";
import { MeasurementModel } from "../models/measurement.model";
import { asyncHandler } from "../utils/asyncHandler";
import { DashboardStats } from "../types";

export const DashboardController = {
  getStats: asyncHandler(async (req: Request, res: Response) => {
    const [totalMeasurements, totalAlerts, verification, totalBlocks, latest] = await Promise.all([
      MeasurementService.count(),
      AlertService.count(),
      BlockchainService.verifyChain(),
      BlockchainService.getChainLength(),
      MeasurementModel.findLatest(1),
    ]);

    const stats: DashboardStats = {
      totalMeasurements,
      totalAlerts,
      blockchainStatus: verification.valid ? "VALID" : "INVALID",
      totalBlocks,
      lastUpdate: latest[0]?.timestamp ?? null,
    };

    res.json({ data: stats });
  }),
};
