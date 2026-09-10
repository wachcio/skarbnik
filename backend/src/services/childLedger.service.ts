import { prisma } from "../lib/prisma";

export interface CategoryLedgerRow {
  categoryId: string;
  categoryName: string;
  archived: boolean;
  target: number;
  paid: number;
  remaining: number;
  payments: Array<{
    id: string;
    amount: number;
    paidAt: Date;
    description: string | null;
  }>;
}

/**
 * Rozliczenie jednego dziecka w danym semestrze, wg kategorii: kwota
 * docelowa (z uwzględnieniem ewentualnego nadpisania), suma wpłat,
 * brakująca kwota, oraz lista samych wpłat. Używane przez:
 * - ekran dziecka (sekcja wpłat),
 * - raport "karta wpłat dziecka",
 * - raport zaległości (przefiltrowany do remaining > 0).
 *
 * Celowo NIE filtrujemy kategorii po `archived` na poziomie zapytania —
 * kategoria zarchiwizowana z historią wpłat/kwoty musi zostać widoczna
 * (patrz PROJECT.md: "historia zostaje widoczna w raportach"). Dopiero
 * na końcu odsiewamy zarchiwizowane kategorie, które nigdy nie miały tu
 * żadnej kwoty ani wpłaty — żeby nie zaśmiecały widoku.
 *
 * `excludePaymentId` pomija jedną wpłatę przy liczeniu sum — używane przy
 * edycji wpłaty, żeby nie liczyć jej starej kwoty podwójnie (patrz
 * zabezpieczenia budżetowe w routes/payments.routes.ts).
 */
export async function getChildLedger(
  childId: string,
  semesterId: string,
  options: { excludePaymentId?: string } = {}
): Promise<CategoryLedgerRow[]> {
  const [categories, overrides, allPayments] = await Promise.all([
    prisma.category.findMany({
      include: { targets: { where: { semesterId } } },
      orderBy: { name: "asc" },
    }),
    prisma.childCategoryAmount.findMany({ where: { childId, semesterId } }),
    prisma.payment.findMany({ where: { childId, semesterId }, orderBy: { paidAt: "desc" } }),
  ]);

  const payments = options.excludePaymentId
    ? allPayments.filter((p) => p.id !== options.excludePaymentId)
    : allPayments;

  return categories
    .map((category) => {
      const override = overrides.find((o) => o.categoryId === category.id);
      const target = override ? Number(override.amount) : Number(category.targets[0]?.amount ?? 0);
      const categoryPayments = payments.filter((p) => p.categoryId === category.id);
      const paid = categoryPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        categoryId: category.id,
        categoryName: category.name,
        archived: category.archived,
        target,
        paid,
        remaining: Math.max(0, target - paid),
        payments: categoryPayments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paidAt: p.paidAt,
          description: p.description,
        })),
      };
    })
    .filter((row) => !row.archived || row.target > 0 || row.paid > 0);
}

export interface ChildSemesterReport {
  semesterId: string;
  semesterLabel: string;
  ledger: CategoryLedgerRow[];
  totalTarget: number;
  totalPaid: number;
  totalRemaining: number;
}

export interface ChildFullReport {
  child: {
    id: string;
    firstName: string;
    lastName: string;
    parentContactEmail: string | null;
    parentContactPhone: string | null;
    notes: string | null;
  };
  semesters: ChildSemesterReport[];
  grandTotalTarget: number;
  grandTotalPaid: number;
}

/**
 * Pełna "karta dziecka" na potrzeby raportu z widoku dziecka: dane
 * kontaktowe/notatki + rozliczenie wg kategorii dla KAŻDEGO semestru
 * naraz (w odróżnieniu od `getChildLedger`, który liczy jeden semestr —
 * ekran dziecka pokazuje jeden na raz z przełącznikiem, ale raport ma
 * dać pełny obraz roku szkolnego na jednym dokumencie).
 */
export async function getChildFullReport(childId: string): Promise<ChildFullReport | null> {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) return null;

  const semesters = await prisma.semester.findMany({ orderBy: { number: "asc" } });
  const semesterReports = await Promise.all(
    semesters.map(async (semester): Promise<ChildSemesterReport> => {
      const ledger = await getChildLedger(childId, semester.id);
      const totalTarget = ledger.reduce((sum, row) => sum + row.target, 0);
      const totalPaid = ledger.reduce((sum, row) => sum + row.paid, 0);
      return {
        semesterId: semester.id,
        semesterLabel: semester.label,
        ledger,
        totalTarget,
        totalPaid,
        totalRemaining: Math.max(0, totalTarget - totalPaid),
      };
    })
  );

  return {
    child: {
      id: child.id,
      firstName: child.firstName,
      lastName: child.lastName,
      parentContactEmail: child.parentContactEmail,
      parentContactPhone: child.parentContactPhone,
      notes: child.notes,
    },
    semesters: semesterReports,
    grandTotalTarget: semesterReports.reduce((sum, s) => sum + s.totalTarget, 0),
    grandTotalPaid: semesterReports.reduce((sum, s) => sum + s.totalPaid, 0),
  };
}
