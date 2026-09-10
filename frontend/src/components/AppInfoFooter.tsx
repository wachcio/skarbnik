import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface AppInfo {
  version: string;
  author: string;
  releaseDate: string;
}

const releaseDateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" });

/** Dyskretna stopka z wersją appki, autorem i datą publikacji — dane
 * pochodzą z /api/health (env APP_VERSION/APP_AUTHOR/APP_RELEASE_DATE
 * na backendzie), nie są na stałe wpisane w kod. */
export function AppInfoFooter() {
  const [info, setInfo] = useState<AppInfo | null>(null);

  useEffect(() => {
    apiFetch("/health").then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      if (data.app) setInfo(data.app);
    });
  }, []);

  if (!info) return null;

  return (
    <p className="app-info-footer">
      Skarbnik Przedszkolny {info.version} · {info.author} · {releaseDateFormatter.format(new Date(info.releaseDate))}
    </p>
  );
}
