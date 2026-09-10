import { useLanguage } from "../context/LanguageContext";

/** Przełącznik języka jako flaga (🇵🇱/🇬🇧), tym samym wzorcem co przełącznik
 * motywu obok — ikonka pokazuje AKTUALNIE aktywny język, klik przełącza. */
export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();
  const isPolish = language === "pl";

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={() => setLanguage(isPolish ? "en" : "pl")}
      aria-label={isPolish ? t("language.switchToEnglish") : t("language.switchToPolish")}
      title={isPolish ? "English" : "Polski"}
    >
      {isPolish ? "🇵🇱" : "🇬🇧"}
    </button>
  );
}
