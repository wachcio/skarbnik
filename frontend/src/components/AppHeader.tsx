import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

interface AppHeaderProps {
  /** Dodatkowe akcje obok przełącznika motywu (np. przycisk Wyloguj). */
  children?: ReactNode;
}

/** Wspólny nagłówek dla wszystkich ekranów (zalogowanych, logowania i
 * strony publicznej) — jedno miejsce na nazwę appki i motyw, żeby nie
 * rozjeżdżały się przy zmianach (patrz PROJECT.md: skrócona nazwa na
 * wąskich telefonach, wcześniej duplikowana osobno w trzech plikach). */
export function AppHeader({ children }: AppHeaderProps) {
  return (
    <header className="app-header">
      <strong>
        Skarbnik<span className="app-title-suffix"> Przedszkolny</span>
      </strong>
      <div className="app-header-actions">
        <ThemeToggle />
        {children}
      </div>
    </header>
  );
}
