import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";

/** Pływający przycisk pomocy widoczny na każdym ekranie appki (nad dolną
 * nawigacją) — ukryty na samej stronie pomocy, żeby się nie dublował. */
export function HelpButton() {
  const location = useLocation();
  const { t } = useLanguage();
  if (location.pathname.startsWith("/help")) return null;

  return (
    <Link to="/help" className="help-fab" aria-label={t("help.aria")}>
      ?
    </Link>
  );
}
