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
