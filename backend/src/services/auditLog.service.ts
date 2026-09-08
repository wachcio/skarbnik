import type { AuditAction } from "@prisma/client";
import { prisma } from "../lib/prisma";

interface RecordAuditInput {
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedById?: string | null;
  performedByLabel: string;
  dataBefore?: unknown;
  dataAfter?: unknown;
}

/**
 * Zapisuje wpis do logu audytowego. Migawki danych (dataBefore/dataAfter)
 * są niezależne od rekordu źródłowego, więc historia przetrwa nawet
 * jego hard delete (np. usunięcie dziecka).
 */
export async function recordAudit(input: RecordAuditInput) {
  await prisma.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      performedById: input.performedById ?? null,
      performedByLabel: input.performedByLabel,
      dataBefore: input.dataBefore as any,
      dataAfter: input.dataAfter as any,
    },
  });
}
