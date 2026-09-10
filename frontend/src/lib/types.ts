export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  parentContactEmail: string | null;
  parentContactPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Me {
  id: string;
  email: string;
  role: "ADMIN" | "PARENT";
  displayName: string;
  childIds: string[];
}

export interface Semester {
  id: string;
  number: number;
  label: string;
}

export interface CategoryTarget {
  id: string;
  categoryId: string;
  semesterId: string;
  amount: string;
}

export interface Category {
  id: string;
  name: string;
  archived: boolean;
  targets: CategoryTarget[];
}

export interface Payment {
  id: string;
  amount: number;
  paidAt: string;
  description: string | null;
}

export interface CategoryLedgerRow {
  categoryId: string;
  categoryName: string;
  archived: boolean;
  target: number;
  paid: number;
  remaining: number;
  payments: Payment[];
}

export interface Settings {
  id: string;
  publicViewEnabled: boolean;
  activeSemesterId: string | null;
}

export interface CategorySummary {
  categoryId: string;
  name: string;
  archived: boolean;
  target: number;
  collected: number;
  /** Brak na widoku publicznym (backend celowo odcina to pole tam). */
  spent?: number;
}

export interface SemesterSummary {
  targetTotal: number;
  collectedTotal: number;
  /** Brak na widoku publicznym. */
  spentTotal?: number;
  childCount: number;
  byCategory: CategorySummary[];
}

export interface TreasuryBalance {
  collectedTotal: number;
  spentTotal: number;
  balance: number;
}

export interface Expense {
  id: string;
  amount: string; // Decimal serializowany przez Prisma jako string w JSON
  spentAt: string;
  description: string | null;
  category: { id: string; name: string; archived: boolean };
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
  monthKey: string;
  monthLabel: string;
  total: number;
  expenses: MonthlyExpenseRow[];
}

export interface MonthlyExpensesReport {
  total: number;
  months: MonthlyExpenseGroup[];
}

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOCKOUT";

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  performedById: string | null;
  performedByLabel: string;
  dataBefore: unknown;
  dataAfter: unknown;
  createdAt: string;
}

export interface AuditLogPage {
  entries: AuditLogEntry[];
  nextCursor: string | null;
}
