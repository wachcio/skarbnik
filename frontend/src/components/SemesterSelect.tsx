import type { Semester } from "../lib/types";

interface SemesterSelectProps {
  semesters: Semester[];
  value: string | null;
  onChange: (semesterId: string) => void;
}

export function SemesterSelect({ semesters, value, onChange }: SemesterSelectProps) {
  return (
    <select className="input semester-select" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      {semesters.map((s) => (
        <option key={s.id} value={s.id}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
