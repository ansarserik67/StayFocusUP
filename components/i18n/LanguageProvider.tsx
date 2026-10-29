"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  htmlLangOf,
  isLang,
  translate,
  type Lang,
  type TranslationKey,
} from "@/lib/i18n";
import { LANG_KEY } from "@/lib/types";

const LANG_EVENT = "stay-focused:lang";

interface LanguageValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageValue | null>(null);

function detectLanguage(): Lang {
  try {
    for (const candidate of navigator.languages ?? [navigator.language]) {
      const lower = candidate.toLowerCase();
      if (lower.startsWith("ru")) return "ru";
      if (lower.startsWith("kk") || lower.startsWith("kz")) return "kk";
    }
  } catch {
    /* no navigator — keep English */
  }
  return "en";
}

function getSnapshot(): Lang {
  try {
    const stored = window.localStorage.getItem(LANG_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* ignore */
  }
  return detectLanguage();
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANG_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANG_EVENT, callback);
  };
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore<Lang>(subscribe, getSnapshot, () => "en");

  useEffect(() => {
    document.documentElement.lang = htmlLangOf(lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(LANG_EVENT));
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      translate(lang, key, vars),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLang must be used inside <LanguageProvider>");
  return context;
}
