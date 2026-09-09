import { prisma } from "../lib/prisma";

export interface CategorySummary {
  categoryId: string;
  name: string;
  archived: boolean;
  target: number;
  collected: number;
}

export interface SemesterSummary {
  targetTotal: number;
  collectedTotal: number;
  childCount: number;
  byCategory: CategorySummary[];
}

/**
 * Zestawienie zbiorcze grupy dla danego semestru: suma kwot docelowych
 * (z uwzględnieniem nadpisań per dziecko) vs suma wpłat, wg kategorii.
 * Używane zarówno przez widok publiczny (zagregowane, bez danych dzieci),
 * jak i raport zbiorczy dla admina.
 *
 * Nie filtrujemy kategorii po `archived` w zapytaniu — historycznie
 * zebrane pieniądze na zarchiwizowanej kategorii mają się dalej liczyć
 * do sum. Odsiewamy dopiero te zarchiwizowane, które nigdy nie miały tu
 * żadnej kwoty ani wpłaty (żeby nie zaśmiecały zestawienia).
 */
export async function getSemesterSummary(semesterId: string): Promise<SemesterSummary> {
  const [categories, children, payments] = await Promise.all([
    prisma.category.findMany({
      include: { targets: { where: { semesterId } } },
    }),
    prisma.child.findMany({
      include: { categoryAmounts: { where: { semesterId } } },
    }),
    prisma.payment.findMany({ where: { semesterId } }),
  ]);

  const byCategory: CategorySummary[] = categories
    .map((category) => {
      const defaultAmount = Number(category.targets[0]?.amount ?? 0);

      const target = children.reduce((sum, child) => {
        const override = child.categoryAmounts.find((a) => a.categoryId === category.id);
        const amount = override ? Number(override.amount) : defaultAmount;
        return sum + amount;
      }, 0);

      const collected = payments
        .filter((p) => p.categoryId === category.id)
        .reduce((sum, p) => sum + Number(p.amount), 0);

      return { categoryId: category.id, name: category.name, archived: category.archived, target, collected };
    })
    .filter((c) => !c.archived || c.target > 0 || c.collected > 0);

  return {
    targetTotal: byCategory.reduce((sum, c) => sum + c.target, 0),
    collectedTotal: byCategory.reduce((sum, c) => sum + c.collected, 0),
    childCount: children.length,
    byCategory,
  };
}

export interface ArrearsRow {
  childId: string;
  childName: string;
  categoryId: string;
  categoryName: string;
  target: number;
  paid: number;
  remaining: number;
}

/**
 * Zestawienie zaległości: dla każdego dziecka i kategorii z kwotą
 * docelową > 0, gdzie suma wpłat nie pokrywa kwoty docelowej.
 */
export async function getArrears(semesterId: string): Promise<ArrearsRow[]> {
  // Bez filtra `archived` — dług na zarchiwizowanej kategorii to nadal
  // realna zaległość. Kategorie bez skonfigurowanej kwoty (target <= 0,
  // np. nigdy nieużywane i zarchiwizowane) odpadają niżej same.
  const [categories, children, payments] = await Promise.all([
    prisma.category.findMany({
      include: { targets: { where: { semesterId } } },
    }),
    prisma.child.findMany({
      include: { categoryAmounts: { where: { semesterId } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    prisma.payment.findMany({ where: { semesterId } }),
  ]);

  const rows: ArrearsRow[] = [];

  for (const child of children) {
    for (const category of categories) {
      const override = child.categoryAmounts.find((a) => a.categoryId === category.id);
      const target = override ? Number(override.amount) : Number(category.targets[0]?.amount ?? 0);
      if (target <= 0) continue;

      const paid = payments
        .filter((p) => p.childId === child.id && p.categoryId === category.id)
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const remaining = target - paid;

      if (remaining > 0) {
        rows.push({
          childId: child.id,
          childName: `${child.firstName} ${child.lastName}`,
          categoryId: category.id,
          categoryName: category.name,
          target,
          paid,
          remaining,
        });
      }
    }
  }

  return rows;
}
