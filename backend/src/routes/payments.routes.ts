import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { notImplemented } from "./notImplemented";

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth);

// GET: admin widzi wszystko, rodzic tylko wpłaty swojego dziecka
// (analogicznie do children.routes.ts) — do zaimplementowania.
paymentsRouter.get("/", notImplemented("Lista wpłat"));
paymentsRouter.post("/", notImplemented("Dodanie wpłaty"));
paymentsRouter.patch("/:id", notImplemented("Edycja wpłaty"));
paymentsRouter.delete("/:id", notImplemented("Usunięcie wpłaty"));
