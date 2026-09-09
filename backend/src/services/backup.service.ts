import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

export const BACKUP_VERSION = 1;

const dateLike = z.union([z.string(), z.date()]).transform((v) => new Date(v));

const semesterSchema = z.object({ id: z.string(), number: z.number(), label: z.string() });

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  archived: z.boolean(),
  createdAt: dateLike.optional(),
  updatedAt: dateLike.optional(),
});

const categoryTargetSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  semesterId: z.string(),
  amount: z.coerce.number(),
});

const childSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  parentContactEmail: z.string().nullable().optional(),
  parentContactPhone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: dateLike.optional(),
  updatedAt: dateLike.optional(),
});

// Celowo BEZ passwordHash — patrz uzasadnienie przy exportBackup().
const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(["ADMIN", "PARENT"]),
  createdAt: dateLike.optional(),
  updatedAt: dateLike.optional(),
});

const parentChildLinkSchema = z.object({ id: z.string(), userId: z.string(), childId: z.string() });

const childCategoryAmountSchema = z.object({
  id: z.string(),
  childId: z.string(),
  categoryId: z.string(),
  semesterId: z.string(),
  amount: z.coerce.number(),
});

const paymentSchema = z.object({
  id: z.string(),
  childId: z.string(),
  categoryId: z.string(),
  semesterId: z.string(),
  amount: z.coerce.number(),
  paidAt: dateLike,
  description: z.string().nullable().optional(),
  createdById: z.string().nullable().optional(),
  createdAt: dateLike.optional(),
  updatedAt: dateLike.optional(),
});

const settingsSchema = z
  .object({
    id: z.string().default("singleton"),
    publicViewEnabled: z.boolean(),
    activeSemesterId: z.string().nullable(),
  })
  .nullable();

export const backupSchema = z.object({
  version: z.number(),
  exportedAt: z.string().optional(),
  data: z.object({
    semesters: z.array(semesterSchema),
    categories: z.array(categorySchema),
    categoryTargets: z.array(categoryTargetSchema),
    children: z.array(childSchema),
    users: z.array(userSchema),
    parentChildLinks: z.array(parentChildLinkSchema),
    childCategoryAmounts: z.array(childCategoryAmountSchema),
    payments: z.array(paymentSchema),
    settings: settingsSchema,
  }),
});

export type BackupData = z.infer<typeof backupSchema>["data"];

/**
 * Pełny eksport bazy do JSON. Konta użytkowników są eksportowane BEZ
 * passwordHash i stanu blokady logowania — nawet zahashowane hasło nie
 * powinno podróżować w pliku, który łatwo przypadkiem komuś przekazać
 * albo zapisać w niezabezpieczonym miejscu. Import generuje dla każdego
 * konta nowe, tymczasowe hasło (patrz importBackup).
 */
export async function exportBackup() {
  const [semesters, categories, categoryTargets, children, users, parentChildLinks, childCategoryAmounts, payments, settings] =
    await Promise.all([
      prisma.semester.findMany(),
      prisma.category.findMany(),
      prisma.categoryTarget.findMany(),
      prisma.child.findMany(),
      prisma.user.findMany({
        select: { id: true, email: true, displayName: true, role: true, createdAt: true, updatedAt: true },
      }),
      prisma.parentChildLink.findMany(),
      prisma.childCategoryAmount.findMany(),
      prisma.payment.findMany(),
      prisma.setting.findUnique({ where: { id: "singleton" } }),
    ]);

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      semesters,
      categories,
      categoryTargets,
      children,
      users,
      parentChildLinks,
      childCategoryAmounts,
      payments,
      settings,
    },
  };
}

export interface ImportResult {
  restoredCounts: Record<string, number>;
  temporaryPasswords: Array<{ email: string; temporaryPassword: string }>;
}

/**
 * Pełne przywrócenie bazy z JSON — zastępuje WSZYSTKIE dane. Niszczące
 * i nieodwracalne, stąd tylko dla admina i po walidacji formatu
 * (backupSchema, sprawdzana w trasie przed wywołaniem tej funkcji).
 *
 * Każde konto dostaje nowe, losowe hasło tymczasowe (oryginalne hashe
 * nie są częścią eksportu) — zwracane w wyniku, do ręcznego przekazania
 * użytkownikom przez admina (bez wysyłki e-maili, patrz PROJECT.md).
 */
export async function importBackup(data: BackupData): Promise<ImportResult> {
  const temporaryPasswords: Array<{ email: string; temporaryPassword: string }> = [];

  const usersToCreate = await Promise.all(
    data.users.map(async (user) => {
      const temporaryPassword = crypto.randomBytes(9).toString("base64url");
      temporaryPasswords.push({ email: user.email, temporaryPassword });
      return { ...user, passwordHash: await hashPassword(temporaryPassword) };
    })
  );

  await prisma.$transaction(
    async (tx) => {
      // Usuwanie w kolejności zgodnej z referencjami — kaskady w schema.prisma
      // i tak by to załatwiły, ale nie polegamy wyłącznie na nich.
      await tx.child.deleteMany({});
      await tx.category.deleteMany({});
      await tx.semester.deleteMany({});
      await tx.user.deleteMany({});

      await tx.semester.createMany({ data: data.semesters });
      await tx.category.createMany({ data: data.categories });
      await tx.categoryTarget.createMany({ data: data.categoryTargets });
      await tx.child.createMany({ data: data.children });
      await tx.user.createMany({
        data: usersToCreate.map((u) => ({
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          role: u.role,
          passwordHash: u.passwordHash,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })),
      });
      await tx.parentChildLink.createMany({ data: data.parentChildLinks });
      await tx.childCategoryAmount.createMany({ data: data.childCategoryAmounts });
      await tx.payment.createMany({ data: data.payments });

      if (data.settings) {
        await tx.setting.upsert({
          where: { id: "singleton" },
          update: {
            publicViewEnabled: data.settings.publicViewEnabled,
            activeSemesterId: data.settings.activeSemesterId,
          },
          create: {
            id: "singleton",
            publicViewEnabled: data.settings.publicViewEnabled,
            activeSemesterId: data.settings.activeSemesterId,
          },
        });
      }
    },
    { timeout: 30_000 }
  );

  return {
    restoredCounts: {
      semestry: data.semesters.length,
      kategorie: data.categories.length,
      dzieci: data.children.length,
      konta: data.users.length,
      wpłaty: data.payments.length,
    },
    temporaryPasswords,
  };
}
