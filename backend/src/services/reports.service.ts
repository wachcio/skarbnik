import { prisma } from "../lib/prisma";
import { warsawMonthKey, warsawMonthLabel } from "../lib/time";

export interface CategorySummary {
  categoryId: string;
  name: string;
  archived: boolean;
  target: number;
  collected: number;
  spent: number;
}

export interface SemesterSummary {
  targetTotal: number;
  collectedTotal: number;
  spentTotal: number;
  childCount: number;
  byCategory: CategorySummary[];
}

/**
 * Zestawienie zbiorcze grupy dla danego semestru: suma kwot docelowych
 * (z uwzględnieniem nadpisań per dziecko) vs suma wpłat, wg kategorii.
 * Do tego suma wydatków w tym samym semestrze/kategorii — druga strona
 * bilansu, żeby dało się na jednym ekranie porównać zebrano/wydano.
 * Używane zarówno przez widok publiczny (zagregowane, bez danych dzieci
 * i bez wydatków — patrz routes/public.routes.ts), jak i raport zbiorczy
 * dla admina.
 *
 * Nie filtrujemy kategorii po `archived` w zapytaniu — historycznie
 * zebrane/wydane pieniądze na zarchiwizowanej kategorii mają się dalej
 * liczyć do sum. Odsiewamy dopiero te zarchiwizowane, które nigdy nie
 * miały tu żadnej kwoty, wpłaty ani wydatku (żeby nie zaśmiecały
 * zestawienia).
 */
export async function getSemesterSummary(semesterId: string): Promise<SemesterSummary> {
  const [categories, children, payments, expenses] = await Promise.all([
    prisma.category.findMany({
      include: { targets: { where: { semesterId } } },
    }),
    prisma.child.findMany({
      include: { categoryAmounts: { where: { semesterId } } },
    }),
    prisma.payment.findMany({ where: { semesterId } }),
    prisma.expense.findMany({ where: { semesterId } }),
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

      const spent = expenses
        .filter((e) => e.categoryId === category.id)
        .reduce((sum, e) => sum + Number(e.amount), 0);

      return { categoryId: category.id, name: category.name, archived: category.archived, target, collected, spent };
    })
    .filter((c) => !c.archived || c.target > 0 || c.collected > 0 || c.spent > 0);

  return {
    targetTotal: byCategory.reduce((sum, c) => sum + c.target, 0),
    collectedTotal: byCategory.reduce((sum, c) => sum + c.collected, 0),
    spentTotal: byCategory.reduce((sum, c) => sum + c.spent, 0),
    childCount: children.length,
    byCategory,
  };
}

export interface TreasuryBalance {
  collectedTotal: number;
  spentTotal: number;
  balance: number;
}

/**
 * Stan kasy skarbnika "tu i teraz": suma wszystkich wpłat minus suma
 * wszystkich wydatków, za całą historię (wszystkie semestry razem).
 * Celowo NIEZALEŻNE od wybranego w UI semestru — to jedno realne konto,
 * które nie zeruje się przy przełączeniu semestru w dropdownie.
 */
export async function getTreasuryBalance(): Promise<TreasuryBalance> {
  const [payments, expenses] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
  ]);

  const collectedTotal = Number(payments._sum.amount ?? 0);
  const spentTotal = Number(expenses._sum.amount ?? 0);

  return { collectedTotal, spentTotal, balance: collectedTotal - spentTotal };
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

export interface MonthlyExpenseRow {
  id: string;
  categoryName: string;
  categoryArchived: boolean;
  amount: number;
  spentAt: string;
  description: string | null;
}

export interface MonthlyExpenseGroup {
  /** Sortowalny klucz miesiąca, np. "2026-09" — do niczego innego niż sortowanie. */
  monthKey: string;
  monthLabel: string;
  total: number;
  expenses: MonthlyExpenseRow[];
}

export interface MonthlyExpensesReport {
  total: number;
  months: MonthlyExpenseGroup[];
}

/**
 * Wydatki danego semestru pogrupowane wg miesiąca (czas polski, patrz
 * lib/time.ts), najnowszy miesiąc na górze — spójnie z listą wydatków
 * w appce (`GET /api/expenses`, sortowana malejąco po dacie).
 */
export async function getExpensesByMonth(semesterId: string): Promise<MonthlyExpensesReport> {
  const expenses = await prisma.expense.findMany({
    where: { semesterId },
    include: { category: true },
    orderBy: { spentAt: "asc" },
  });

  const groups = new Map<string, MonthlyExpenseGroup>();
  for (const expense of expenses) {
    const key = warsawMonthKey(expense.spentAt);
    const amount = Number(expense.amount);
    const group = groups.get(key) ?? { monthKey: key, monthLabel: warsawMonthLabel(expense.spentAt), total: 0, expenses: [] };
    group.total += amount;
    group.expenses.push({
      id: expense.id,
      categoryName: expense.category.name,
      categoryArchived: expense.category.archived,
      amount,
      spentAt: expense.spentAt.toISOString(),
      description: expense.description,
    });
    groups.set(key, group);
  }

  const months = Array.from(groups.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  return { total: months.reduce((sum, m) => sum + m.total, 0), months };
}
