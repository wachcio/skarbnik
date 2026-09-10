import { Link, useLocation } from "react-router-dom";

/** Pływający przycisk pomocy widoczny na każdym ekranie appki (nad dolną
 * nawigacją) — ukryty na samej stronie pomocy, żeby się nie dublował. */
export function HelpButton() {
  const location = useLocation();
  if (location.pathname.startsWith("/help")) return null;

  return (
    <Link to="/help" className="help-fab" aria-label="Pomoc">
      ?
    </Link>
  );
}
