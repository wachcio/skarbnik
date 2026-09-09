import { Router } from "express";
import { prisma } from "../lib/prisma";
import { formatWarsawDateTime } from "../lib/time";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const now = new Date();
    res.json({
      status: "ok",
      database: "connected",
      // ISO 8601 w UTC — standard dla API, do odczytu maszynowego.
      time: now.toISOString(),
      // Do szybkiego sprawdzenia ręcznie w przeglądarce.
      timeLocal: formatWarsawDateTime(now),
    });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});
