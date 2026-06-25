import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";

/**
 * Middleware genérico que valida y sanitiza `req.query` contra un esquema Zod.
 * Si la validación falla, lanza un ZodError que es capturado por `asyncHandler`
 * (al estar este middleware envuelto en asyncHandler donde se usa) y resuelto
 * por el `errorHandler` centralizado, devolviendo un 400 con el detalle del campo
 * inválido.
 *
 * Tras validar, reemplaza `req.query` por la versión parseada (con tipos y
 * defaults aplicados), evitando volver a parsear manualmente en el controller.
 */
export function validateQuery(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req.query);
    req.query = parsed as unknown as Request["query"];
    next();
  };
}

/**
 * Equivalente a `validateQuery` pero para `req.params` (segmentos de la URL,
 * ej. `:measurementId`). Mismo comportamiento: valida, sanitiza/coacciona
 * tipos, y reemplaza `req.params` por la versión parseada.
 */
export function validateParams(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req.params);
    req.params = parsed as unknown as Request["params"];
    next();
  };
}
