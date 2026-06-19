/**
 * Error de aplicación con código HTTP asociado.
 * Los controllers y servicios deben lanzar esta clase (en vez de Error genérico)
 * cuando el error es "esperado" (ej. validación fallida, recurso no encontrado),
 * para que el middleware de errores pueda devolver el status code correcto
 * y un mensaje seguro para el cliente, sin filtrar detalles internos.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
