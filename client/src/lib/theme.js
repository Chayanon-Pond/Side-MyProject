import { useCallback, useSyncExternalStore } from "react";

export const THEMES = { dark: "apex-dark", light: "apex-light" };
const KEY = "apex-theme";
const listeners = new Set();

const read = () => document.documentElement.getAttribute("data-theme") || THEMES.dark;

const stored = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

const apply = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", theme === THEMES.light ? "#f5f3ee" : "#0b0b0c"));
  listeners.forEach((l) => l());
};

// Follow the OS while the visitor hasn't made an explicit choice.
if (typeof window !== "undefined" && window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", (e) => {
    if (!stored()) apply(e.matches ? THEMES.light : THEMES.dark);
  });
}

const subscribe = (cb) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** [theme, toggle, setTheme] — persisted in localStorage, initial value set pre-paint in index.html. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => THEMES.dark);
  const setTheme = useCallback((next) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // private mode: theme still applies for this page view
    }
    apply(next);
  }, []);
  const toggle = useCallback(() => setTheme(read() === THEMES.dark ? THEMES.light : THEMES.dark), [setTheme]);
  return { theme, isDark: theme === THEMES.dark, toggle, setTheme };
}
