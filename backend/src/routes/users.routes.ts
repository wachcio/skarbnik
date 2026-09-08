import { Router } from "express";
import { requireRole } from "../middleware/auth";
import { notImplemented } from "./notImplemented";

export const usersRouter = Router();
usersRouter.use(requireRole("ADMIN"));

// Konta rodziców tworzy/zarządza wyłącznie admin — patrz PROJECT.md
// (brak samodzielnej rejestracji i resetu hasła e-mailem).
usersRouter.get("/", notImplemented("Lista kont (rodzice)"));
usersRouter.post("/", notImplemented("Utworzenie konta rodzica i powiązanie z dzieckiem/dziećmi"));
usersRouter.patch("/:id", notImplemented("Edycja konta / przypisań do dzieci"));
usersRouter.post("/:id/reset-password", notImplemented("Ręczny reset hasła przez admina"));
usersRouter.delete("/:id", notImplemented("Usunięcie konta"));
