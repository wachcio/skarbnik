import express from "express";
import { applySecurityMiddleware } from "./middleware/security";
import { applySessionMiddleware } from "./middleware/session";
import { errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  applySecurityMiddleware(app);
  app.use(express.json({ limit: "1mb" }));
  applySessionMiddleware(app);

  app.use("/api", apiRouter);

  app.use((_req, res) => res.status(404).json({ error: "Nie znaleziono zasobu." }));
  app.use(errorHandler);

  return app;
}
