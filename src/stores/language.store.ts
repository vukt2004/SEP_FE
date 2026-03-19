import { create } from "zustand";

const LANG_KEY = "quackorbit_lang";

export type LocaleId = "en" | "vi";

function loadLocale(): LocaleId {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "en" || saved === "vi") return saved;
  } catch {
    /* ignore */
  }
  return "en";
}

interface LanguageState {
  locale: LocaleId;
  setLocale: (locale: LocaleId) => void;
  toggle: () => LocaleId;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  locale: loadLocale(),

  setLocale: (locale) => {
    localStorage.setItem(LANG_KEY, locale);
    set({ locale });
  },

  toggle: () => {
    let next: LocaleId = "en";
    set((state) => {
      next = state.locale === "en" ? "vi" : "en";
      localStorage.setItem(LANG_KEY, next);
      return { locale: next };
    });
    return next;
  },
}));
