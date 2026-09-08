import { Router } from "express";
import { requireRole } from "../middleware/auth";
import { notImplemented } from "./notImplemented";

export const categoriesRouter = Router();
categoriesRouter.use(requireRole("ADMIN"));

categoriesRouter.get("/", notImplemented("Lista kategorii"));
categoriesRouter.post("/", notImplemented("Dodanie kategorii"));
categoriesRouter.get("/:id/targets", notImplemented("Kwoty domyślne kategorii"));
categoriesRouter.put("/:id/targets/:semesterId", notImplemented("Ustawienie kwoty domyślnej"));
categoriesRouter.patch("/:id", notImplemented("Edycja kategorii"));
categoriesRouter.delete("/:id", notImplemented("Archiwizacja kategorii (soft delete)"));
