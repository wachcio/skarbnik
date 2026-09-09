import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

/** Zapamiętuje wybór w localStorage; "system" usuwa atrybut i oddaje
 * decyzję @media (prefers-color-scheme) w theme.css. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme | null) ?? "system"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", theme);
    }
    try {
      localStorage.setItem("theme", theme);
    } catch {
      // localStorage może być niedostępny (np. tryb prywatny) — pomijamy
    }
  }, [theme]);

  return [theme, setThemeState];
}
