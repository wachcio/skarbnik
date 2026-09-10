import { Router } from "express";
import { prisma } from "../lib/prisma";
import { formatWarsawDateTime } from "../lib/time";
import { env } from "../config/env";

export const healthRouter = Router();

// Wersja/autor/data publikacji — czysto informacyjne, bez logowania (patrz
// stopka w Ustawieniach we frontendzie). Świadomie w /health, nie w osobnym
// endponcie: to ten sam rodzaj "informacji diagnostycznych o appce", co
// reszta tej trasy.
healthRouter.get("/", async (_req, res) => {
  const app = { version: env.APP_VERSION, author: env.APP_AUTHOR, releaseDate: env.APP_RELEASE_DATE };
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
      app,
    });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable", app });
  }
});
