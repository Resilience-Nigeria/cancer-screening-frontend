"use client";
// lib/i18n/LanguageProvider.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations, type LangCode } from "./translations";

const STORAGE_KEY = "ncsr_language";

interface LanguageContextValue {
  language: LangCode;
  /** true once the visitor has picked a language on this page load */
  confirmed: boolean;
  /** pick a language from the first-load prompt */
  confirmLanguage: (lang: LangCode) => void;
  /** switch language at any time (header switcher) */
  setLanguage: (lang: LangCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function isLang(v: unknown): v is LangCode {
  return v === "en" || v === "ha" || v === "yo" || v === "ig";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LangCode>("en");
  // Always false on a fresh load, so the visitor is asked every time
  // (these portals are often used on shared phones / at outreach events).
  const [confirmed, setConfirmed] = useState(false);

  // Pre-highlight the last language used on this device (does not skip the prompt).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLang(saved)) setLanguageState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const persist = (lang: LangCode) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {}
  };

  const setLanguage = useCallback((lang: LangCode) => {
    setLanguageState(lang);
    persist(lang);
  }, []);

  const confirmLanguage = useCallback((lang: LangCode) => {
    setLanguageState(lang);
    persist(lang);
    setConfirmed(true);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = translations[language] as Record<string, string>;
      const fallback = translations.en as Record<string, string>;
      let str = dict[key] ?? fallback[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, confirmed, confirmLanguage, setLanguage, t }),
    [language, confirmed, confirmLanguage, setLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}