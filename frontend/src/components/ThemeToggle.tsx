import { useTheme, type Theme } from "../hooks/useTheme";

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
      aria-label="Motyw"
      className="input theme-select"
    >
      <option value="system">Motyw: systemowy</option>
      <option value="light">Motyw: jasny</option>
      <option value="dark">Motyw: ciemny</option>
    </select>
  );
}
