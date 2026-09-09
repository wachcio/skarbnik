import { Router } from "express";
import { prisma } from "../lib/prisma";

export const healthRouter = Router();

// Format czasu, żeby ktoś sprawdzający ten endpoint ręcznie w przeglądarce
// nie musiał w głowie przeliczać UTC -> czas polski. Stała strefa (nie
// zależna od TZ kontenera, który domyślnie i tak jest UTC) — to appka dla
// jednej, konkretnej placówki, nie wielostrefowy serwis.
const localTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Europe/Warsaw",
});

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
      timeLocal: localTimeFormatter.format(now),
    });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});
