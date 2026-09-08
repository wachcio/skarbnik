import { Router } from "express";
import { requireRole } from "../middleware/auth";
import { notImplemented } from "./notImplemented";

export const backupRouter = Router();
backupRouter.use(requireRole("ADMIN"));

backupRouter.get("/export", notImplemented("Pełny eksport bazy do JSON"));
backupRouter.post("/import", notImplemented("Pełny import/przywrócenie bazy z JSON"));
