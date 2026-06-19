import { NextFunction, Request, Response } from "express";

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Envuelve un controller async para que cualquier excepción (incluyendo
 * rechazos de promesas) sea reenviada a `next(err)` y termine en el
 * middleware centralizado de errores, en lugar de quedar como una promesa
 * no manejada o requerir try/catch repetido en cada controller.
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
