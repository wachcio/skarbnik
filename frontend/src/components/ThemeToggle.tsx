import { useTheme } from "../hooks/useTheme";

/** Przełącznik motywu jako pojedyncza ikonka (☀️ w jasnym, 🌙 w ciemnym)
 * zamiast listy rozwijanej — kliknięcie od razu przełącza na przeciwny
 * motyw. Ikonka pokazuje motyw AKTUALNIE aktywny. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Przełącz na jasny motyw" : "Przełącz na ciemny motyw"}
      title={isDark ? "Jasny motyw" : "Ciemny motyw"}
    >
      {isDark ? "🌙" : "☀️"}
    </button>
  );
}
