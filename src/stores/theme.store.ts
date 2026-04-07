import { create } from "zustand";

const THEME_KEY = "quackorbit_theme";

export type ThemeId = "dark" | "light";

export function applyTheme(theme: ThemeId) {
  document.documentElement.setAttribute("data-theme", theme);
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function loadTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* ignore */
  }
  return "dark";
}

const initial = loadTheme();
applyTheme(initial);

interface ThemeState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  toggle: () => ThemeId;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: initial,

  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },

  toggle: () => {
    const current = loadTheme();
    const next: ThemeId = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    set({ theme: next });
    return next;
  },
}));
