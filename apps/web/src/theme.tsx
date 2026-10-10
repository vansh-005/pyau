import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
const KEY = "pyau.theme";

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null; // storage blocked: follow the system
  }
}
const systemDark = () => typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;

interface Ctx {
  /** The theme actually shown (explicit choice, else the system's). */
  theme: Theme;
  toggle: () => void;
}
const ThemeContext = createContext<Ctx>({ theme: "light", toggle: () => undefined });

/** Light/dark: follows the system by default; the toggle sets an explicit choice that is remembered. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [explicit, setExplicit] = useState<Theme | null>(stored);
  const [sys, setSys] = useState<boolean>(systemDark);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const f = () => setSys(mq.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  const theme: Theme = explicit ?? (sys ? "dark" : "light");
  useEffect(() => {
    if (explicit) document.documentElement.dataset.theme = explicit;
    else delete document.documentElement.dataset.theme;
  }, [explicit]);
  const toggle = useCallback(() => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setExplicit(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* the choice still applies for this visit */
    }
  }, [theme]);
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
