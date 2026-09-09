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
}

export interface SemesterSummary {
  targetTotal: number;
  collectedTotal: number;
  childCount: number;
  byCategory: CategorySummary[];
}
