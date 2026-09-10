import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

/** Przy pierwszej wizycie (brak zapisanego wyboru) dopasowujemy się do
 * preferencji systemowej — dopiero kliknięcie przełącznika zapisuje
 * jawny, trwały wybór w localStorage. */
function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage może być niedostępny (np. tryb prywatny) — pomijamy
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Prosty przełącznik jasny/ciemny (ikonka słońca/księżyca) — zapamiętuje
 * wybór w localStorage i ustawia atrybut na <html>, który theme.css
 * czyta jako źródło prawdy (patrz [data-theme] w theme.css). */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // localStorage może być niedostępny (np. tryb prywatny) — pomijamy
    }
  }, [theme]);

  return [theme, setTheme];
}
