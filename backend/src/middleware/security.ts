import helmet from "helmet";
import cors from "cors";
import type { Express } from "express";
import { env } from "../config/env";

/**
 * Nagłówki bezpieczeństwa (Helmet: CSP, HSTS, X-Frame-Options i in.) oraz
 * CORS. `trust proxy` ustawiane tu też — potrzebne, żeby ciasteczko sesji
 * (cookie.secure = "auto") poprawnie rozpoznawało HTTPS, gdy TLS terminuje
 * NGINX Proxy Manager przed appką (patrz TRUST_PROXY w .env).
 */
export function applySecurityMiddleware(app: Express) {
  app.set("trust proxy", env.TRUST_PROXY ? 1 : 0);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: env.NODE_ENV === "production",
    })
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: true,
    })
  );
}
