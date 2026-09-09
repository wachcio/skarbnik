import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole, sessionLabel } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { recordAudit } from "../services/auditLog.service";

export const settingsRouter = Router();
settingsRouter.use(requireRole("ADMIN"));

const settingsSchema = z.object({
  publicViewEnabled: z.boolean().optional(),
  activeSemesterId: z.string().nullable().optional(),
});

async function getOrCreateSettings() {
  return prisma.setting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await getOrCreateSettings());
  })
);

settingsRouter.patch(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." });
    }

    if (parsed.data.activeSemesterId) {
      const semester = await prisma.semester.findUnique({ where: { id: parsed.data.activeSemesterId } });
      if (!semester) return res.status(400).json({ error: "Nie znaleziono semestru." });
    }

    const before = await getOrCreateSettings();
    const after = await prisma.setting.update({ where: { id: "singleton" }, data: parsed.data });

    await recordAudit({
      entityType: "Setting",
      entityId: "singleton",
      action: "UPDATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
      dataBefore: before,
      dataAfter: after,
    });

    res.json(after);
  })
);
