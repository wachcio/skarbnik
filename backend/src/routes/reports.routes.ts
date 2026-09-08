import { Router } from "express";
import { requireRole } from "../middleware/auth";
import { notImplemented } from "./notImplemented";

export const reportsRouter = Router();
reportsRouter.use(requireRole("ADMIN"));

reportsRouter.get("/arrears", notImplemented("Zestawienie zaległości"));
reportsRouter.get("/summary", notImplemented("Zestawienie zbiorcze grupy (reużywa services/reports.service.ts)"));
reportsRouter.get("/child/:id", notImplemented("Karta wpłat dziecka"));
reportsRouter.get("/export", notImplemented("Eksport raportu do PDF/Excel"));
