import express from "express";
import { applySecurityMiddleware } from "./middleware/security";
import { applySessionMiddleware } from "./middleware/session";
import { errorHandler } from "./middleware/errorHandler";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  applySecurityMiddleware(app);
  // 5mb: zwykłe żądania są małe, ale import pełnego backupu JSON
  // (docs/API.md, /api/backup/import) może być większy niż domyślne 1mb.
  app.use(express.json({ limit: "5mb" }));
  applySessionMiddleware(app);

  app.use("/api", apiRouter);

  app.use((_req, res) => res.status(404).json({ error: "Nie znaleziono zasobu." }));
  app.use(errorHandler);

  return app;
}
