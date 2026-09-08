import { Router } from "express";
import { requireRole } from "../middleware/auth";
import { notImplemented } from "./notImplemented";

export const settingsRouter = Router();
settingsRouter.use(requireRole("ADMIN"));

settingsRouter.get("/", notImplemented("Odczyt ustawień"));
settingsRouter.patch("/", notImplemented("Zmiana ustawień (np. przełącznik widoku publicznego)"));
