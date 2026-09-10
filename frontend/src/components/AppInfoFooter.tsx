import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useLanguage } from "../context/LanguageContext";

interface AppInfo {
  version: string;
  author: string;
  releaseDate: string;
}

/** Dyskretna stopka z wersją appki, autorem i datą publikacji — dane
 * pochodzą z /api/health (env APP_VERSION/APP_AUTHOR/APP_RELEASE_DATE
 * na backendzie), nie są na stałe wpisane w kod. Nazwa appki ("Skarbnik
 * Przedszkolny") zostaje po polsku niezależnie od języka interfejsu —
 * to nazwa własna, nie tekst do tłumaczenia. Data jest sformatowana
 * lokalnie do wybranego języka (pl-PL/en-GB), w odróżnieniu od kwot i
 * dat w reszcie appki, które celowo zostają zawsze polskie (patrz
 * translations.ts) — tu to tylko metadana "kiedy wydano appkę", nie
 * dane księgowe realnej placówki. */
export function AppInfoFooter() {
  const { language, t } = useLanguage();
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    apiFetch("/health").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (data.app) setInfo(data.app);
    });
  }, []);

  if (!info) return null;

  const releaseDateFormatter = new Intl.DateTimeFormat(language === "en" ? "en-GB" : "pl-PL", { dateStyle: "long" });

  return (
    <p className="app-info-footer">
      {t("appInfo.text", {
        version: info.version,
        author: info.author,
        date: releaseDateFormatter.format(new Date(info.releaseDate)),
      })}
    </p>
  );
}
