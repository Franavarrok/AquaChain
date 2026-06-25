import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";
import { config } from "../config/env";

/**
 * Middleware centralizado de errores (debe registrarse al final de la cadena
 * de middlewares en app.ts, con la firma de 4 argumentos para que Express
 * lo reconozca como error handler).
 *
 * Principios de seguridad aplicados:
 * - Nunca se devuelve el stack trace ni detalles internos al cliente en producción.
 * - Errores de validación (Zod) se traducen a 400 con detalle de campos, ya que
 *   esa información es útil y segura para el cliente (no expone internals).
 * - Cualquier error no esperado se loguea completo en el servidor pero se
 *   responde con un mensaje genérico 500 al cliente.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Datos de entrada inválidos.",
      details: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error("Error operacional inesperado", { message: err.message, path: req.path });
    }
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  const message = err instanceof Error ? err.message : "Error desconocido";
  logger.error("Error no controlado", { message, path: req.path, method: req.method });

  res.status(500).json({
    error: "Ocurrió un error interno en el servidor.",
    ...(config.nodeEnv !== "production" ? { debug: message } : {}),
  });
}
