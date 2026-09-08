import { prisma } from "../lib/prisma";

export interface CategorySummary {
  categoryId: string;
  name: string;
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
 */
export async function getSemesterSummary(semesterId: string): Promise<SemesterSummary> {
  const [categories, children, payments] = await Promise.all([
    prisma.category.findMany({
      where: { archived: false },
      include: { targets: { where: { semesterId } } },
    }),
    prisma.child.findMany({
      include: { categoryAmounts: { where: { semesterId } } },
    }),
    prisma.payment.findMany({ where: { semesterId } }),
  ]);

  const byCategory: CategorySummary[] = categories.map((category) => {
    const defaultAmount = Number(category.targets[0]?.amount ?? 0);

    const target = children.reduce((sum, child) => {
      const override = child.categoryAmounts.find((a) => a.categoryId === category.id);
      const amount = override ? Number(override.amount) : defaultAmount;
      return sum + amount;
    }, 0);

    const collected = payments
      .filter((p) => p.categoryId === category.id)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return { categoryId: category.id, name: category.name, target, collected };
  });

  return {
    targetTotal: byCategory.reduce((sum, c) => sum + c.target, 0),
    collectedTotal: byCategory.reduce((sum, c) => sum + c.collected, 0),
    childCount: children.length,
    byCategory,
  };
}
