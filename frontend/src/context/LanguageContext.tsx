import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Language } from "../i18n/translations";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** Tłumaczenie po kluczu, z opcjonalnym podstawieniem `{zmienna}`.
   * Brak klucza w słowniku → zwraca sam klucz (widoczne w UI, łatwe do
   * zauważenia podczas developmentu, appka się nie wywala). */
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function getInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem("language");
    if (stored === "pl" || stored === "en") return stored;
  } catch {
    // localStorage może być niedostępny (np. tryb prywatny) — pomijamy
  }
  return "pl";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.setAttribute("lang", language);
    try {
      localStorage.setItem("language", language);
    } catch {
      // localStorage może być niedostępny — pomijamy
    }
  }, [language]);

  function t(key: string, vars?: Record<string, string | number>): string {
    const dict = translations[language];
    let text = dict[key] ?? translations.pl[key] ?? key;
    if (vars) {
      for (const [varName, value] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${varName}\\}`, "g"), String(value));
      }
    }
    return text;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageState, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage musi być użyty wewnątrz <LanguageProvider>.");
  return ctx;
}
