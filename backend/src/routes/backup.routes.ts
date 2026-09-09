import { Router } from "express";
import { requireRole, sessionLabel } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { exportBackup, importBackup, backupSchema } from "../services/backup.service";
import { recordAudit } from "../services/auditLog.service";

export const backupRouter = Router();
backupRouter.use(requireRole("ADMIN"));

backupRouter.get(
  "/export",
  asyncHandler(async (req, res) => {
    const backup = await exportBackup();

    await recordAudit({
      entityType: "Backup",
      entityId: "export",
      action: "CREATE",
      performedById: req.session.userId,
      performedByLabel: sessionLabel(req),
    });

    const filename = `skarbnik-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.json(backup);
  })
);

// Niszczące i nieodwracalne: zastępuje WSZYSTKIE dane. Po udanym imporcie
// sesja bieżącego admina jest niszczona — konto mogło dostać nowe id/hasło
// wraz z resztą przywróconych danych, więc bezpieczniej wymusić ponowne
// logowanie niż zgadywać, czy sesja jest nadal poprawna.
backupRouter.post(
  "/import",
  asyncHandler(async (req, res) => {
    const parsed = backupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Nieprawidłowy format pliku kopii zapasowej." });
    }

    const result = await importBackup(parsed.data.data);
    const performedByLabel = sessionLabel(req);

    await recordAudit({
      entityType: "Backup",
      entityId: "import",
      action: "UPDATE",
      performedById: null,
      performedByLabel,
      dataAfter: result.restoredCounts,
    });

    req.session.destroy(() => {
      res.clearCookie("skarbnik.sid");
      res.status(200).json(result);
    });
  })
);
