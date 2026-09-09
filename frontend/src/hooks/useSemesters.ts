import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { Semester } from "../lib/types";

/** Lista semestrów + wybrany semestr (domyślnie pierwszy), do współdzielenia
 * między ekranami, które pokazują dane "w danym semestrze" (dziecko,
 * kategorie, raporty). */
export function useSemesters() {
  const [semesters, setSemesters] = useState<Semester[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/semesters").then(async (res) => {
      if (!res.ok) return;
      const data: Semester[] = await res.json();
      setSemesters(data);
      setSelectedId((current) => current ?? data[0]?.id ?? null);
    });
  }, []);

  return { semesters, selectedId, setSelectedId, loading: semesters === null };
}
