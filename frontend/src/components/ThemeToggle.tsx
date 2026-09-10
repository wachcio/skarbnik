import { useTheme } from "../hooks/useTheme";
import { useLanguage } from "../context/LanguageContext";

/** Przełącznik motywu jako pojedyncza ikonka (☀️ w jasnym, 🌙 w ciemnym)
 * zamiast listy rozwijanej — kliknięcie od razu przełącza na przeciwny
 * motyw. Ikonka pokazuje motyw AKTUALNIE aktywny. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? t("theme.switchToLight") : t("theme.switchToDark")}
      title={isDark ? t("theme.light") : t("theme.dark")}
    >
      {isDark ? "🌙" : "☀️"}
    </button>
  );
}
