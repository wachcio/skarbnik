import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { getSemesterSummary, getArrears } from "../services/reports.service";
import { getChildLedger } from "../services/childLedger.service";
import { notImplemented } from "./notImplemented";

export const reportsRouter = Router();
reportsRouter.use(requireRole("ADMIN"));

function requireSemesterId(req: { query: { semesterId?: unknown } }): string | null {
  const semesterId = req.query.semesterId;
  return typeof semesterId === "string" && semesterId.length > 0 ? semesterId : null;
}

reportsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const semesterId = requireSemesterId(req);
    if (!semesterId) return res.status(400).json({ error: "Podaj semesterId." });
    res.json(await getSemesterSummary(semesterId));
  })
);

reportsRouter.get(
  "/arrears",
  asyncHandler(async (req, res) => {
    const semesterId = requireSemesterId(req);
    if (!semesterId) return res.status(400).json({ error: "Podaj semesterId." });
    res.json(await getArrears(semesterId));
  })
);

reportsRouter.get(
  "/child/:id",
  asyncHandler(async (req, res) => {
    const semesterId = requireSemesterId(req);
    if (!semesterId) return res.status(400).json({ error: "Podaj semesterId." });

    const child = await prisma.child.findUnique({ where: { id: req.params.id } });
    if (!child) return res.status(404).json({ error: "Nie znaleziono dziecka." });

    const ledger = await getChildLedger(req.params.id, semesterId);
    res.json({ child, ledger });
  })
);

reportsRouter.get("/export", notImplemented("Eksport raportu do PDF/Excel"));
