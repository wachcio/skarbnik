import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getSemesterSummary } from "../services/reports.service";
import { asyncHandler } from "../lib/asyncHandler";

export const publicRouter = Router();

// Bez logowania — tylko zagregowane dane grupy, nigdy imiona/nazwiska
// dzieci. Włączane/wyłączane przez admina (Setting.publicViewEnabled).
publicRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const settings = await prisma.setting.findUnique({ where: { id: "singleton" } });

    if (!settings?.publicViewEnabled) {
      return res.status(404).json({ error: "Widok publiczny jest wyłączony." });
    }

    const requestedSemesterId = req.query.semesterId as string | undefined;
    const semesterId =
      requestedSemesterId ??
      settings.activeSemesterId ??
      (await prisma.semester.findFirst({ orderBy: { number: "asc" } }))?.id;

    if (!semesterId) {
      return res.json({ targetTotal: 0, collectedTotal: 0, childCount: 0, byCategory: [] });
    }

    // Wydatki i stan kasy to informacja dla skarbnika (admina), nie dla
    // anonimowych widzów — publiczny widok pokazuje tylko postęp zbiórki,
    // więc pola `spent`/`spentTotal` są tu celowo odcinane.
    const { spentTotal, byCategory, ...rest } = await getSemesterSummary(semesterId);
    res.json({ ...rest, byCategory: byCategory.map(({ spent, ...category }) => category) });
  })
);
