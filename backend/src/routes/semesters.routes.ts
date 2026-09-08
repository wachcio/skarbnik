import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

export const semestersRouter = Router();

semestersRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const semesters = await prisma.semester.findMany({ orderBy: { number: "asc" } });
    res.json(semesters);
  })
);
