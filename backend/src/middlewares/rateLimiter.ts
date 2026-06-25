import rateLimit from "express-rate-limit";
import { config } from "../config/env";

/**
 * Rate limiting básico sobre todos los endpoints públicos de la API.
 * Como todos los endpoints son de solo lectura (GET), el objetivo principal
 * es prevenir abuso/scraping agresivo durante la demo pública, no proteger
 * contra ataques de fuerza bruta sobre credenciales (no hay login).
 *
 * Los valores son configurables vía variables de entorno para poder ajustarlos
 * sin redeploy de código si el límite resulta muy estricto durante la demo.
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true, // expone RateLimit-* headers
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes. Por favor, intentá nuevamente en un momento." },
});
