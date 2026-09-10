import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { getSemesterSummary, getArrears, getTreasuryBalance, getExpensesByMonth } from "../services/reports.service";
import { getChildLedger } from "../services/childLedger.service";
import {
  sendSummaryPdf,
  sendSummaryXlsx,
  sendArrearsPdf,
  sendArrearsXlsx,
  sendExpensesByMonthPdf,
  sendExpensesByMonthXlsx,
} from "../services/export.service";

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
  "/balance",
  asyncHandler(async (_req, res) => {
    res.json(await getTreasuryBalance());
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
  "/expenses-by-month",
  asyncHandler(async (req, res) => {
    const semesterId = requireSemesterId(req);
    if (!semesterId) return res.status(400).json({ error: "Podaj semesterId." });
    res.json(await getExpensesByMonth(semesterId));
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

reportsRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    const semesterId = requireSemesterId(req);
    if (!semesterId) return res.status(400).json({ error: "Podaj semesterId." });

    const report = req.query.report;
    const format = req.query.format;
    if (report !== "summary" && report !== "arrears" && report !== "expenses-by-month") {
      return res.status(400).json({ error: "Nieprawidłowy parametr report — dozwolone: summary, arrears, expenses-by-month." });
    }
    if (format !== "xlsx" && format !== "pdf") {
      return res.status(400).json({ error: "Nieprawidłowy parametr format — dozwolone: xlsx, pdf." });
    }

    const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
    if (!semester) return res.status(404).json({ error: "Nie znaleziono semestru." });

    if (report === "summary") {
      const summary = await getSemesterSummary(semesterId);
      if (format === "xlsx") return sendSummaryXlsx(res, summary, semester.label);
      return sendSummaryPdf(res, summary, semester.label);
    }

    if (report === "arrears") {
      const arrears = await getArrears(semesterId);
      if (format === "xlsx") return sendArrearsXlsx(res, arrears, semester.label);
      return sendArrearsPdf(res, arrears, semester.label);
    }

    const monthly = await getExpensesByMonth(semesterId);
    if (format === "xlsx") return sendExpensesByMonthXlsx(res, monthly, semester.label);
    return sendExpensesByMonthPdf(res, monthly, semester.label);
  })
);
