import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "./en.json";
import hi from "./hi.json";

export type Lang = "en" | "hi";
type Dict = Record<string, string>;
const DICT: Record<Lang, Dict> = { en: en as Dict, hi: hi as Dict };
const KEY = "pyau.lang";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

function translator(lang: Lang) {
  return (key: string, vars?: Record<string, string | number>) => {
    let s = DICT[lang][key] ?? DICT.en[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  };
}

function load(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "hi") return v;
  } catch {
    /* storage blocked: default to English */
  }
  return "en";
}

const LangContext = createContext<Ctx>({ lang: "en", setLang: () => undefined, t: translator("en") });

/** App-wide language: English by default, persisted in localStorage (every access guarded). */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(load);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* the choice still applies for this visit */
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t: translator(lang) }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** Render a subtree in a fixed language (the host phone follows the host's own preferred language). */
export function FixedLang({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => ({ lang, setLang: () => undefined, t: translator(lang) }), [lang]);
  return (
    <LangContext.Provider value={value}>
      <div lang={lang} className="contents">
        {children}
      </div>
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
