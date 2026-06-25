import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";

import measurementRoutes from "./routes/measurement.routes";
import blockchainRoutes from "./routes/blockchain.routes";
import alertRoutes from "./routes/alert.routes";
import dashboardRoutes from "./routes/dashboard.routes";

import { apiRateLimiter } from "./middlewares/rateLimiter";
import { errorHandler } from "./middlewares/errorHandler";
import { notFoundHandler } from "./middlewares/notFound";
import { config } from "./config/env";

export function createApp(): Application {
  const app = express();

  // Cabeceras HTTP seguras por defecto (X-Content-Type-Options, HSTS, etc.)
  app.use(helmet());

  // CORS restringido exclusivamente a los orígenes configurados en
  // CORS_ALLOWED_ORIGINS (en producción, el dominio de Vercel). Cualquier
  // otro origen recibe un error de CORS del navegador.
  app.use(
    cors({
      origin: (origin, callback) => {
        // Sin header Origin (ej. curl, server-to-server, health checks) -> permitir.
        if (!origin) return callback(null, true);
        if (config.corsAllowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origen no autorizado por política CORS: ${origin}`));
      },
      methods: ["GET"], // la API pública es exclusivamente de lectura
    })
  );

  app.use(express.json({ limit: "10kb" })); // body pequeño: no hay endpoints de escritura pública

  // Rate limiting aplicado a toda la superficie pública de la API.
  app.use("/api", apiRateLimiter);

  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", service: "aquachain-backend", env: config.nodeEnv });
  });

  app.use("/api/measurements", measurementRoutes);
  app.use("/api/blockchain", blockchainRoutes);
  app.use("/api/alerts", alertRoutes);
  app.use("/api/dashboard", dashboardRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
