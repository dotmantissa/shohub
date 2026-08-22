import type { Theme } from "@/components/theme-context";

export const THEME_STORAGE_KEY = "shohub.theme";

export function resolveTheme(storedTheme: string | null, prefersDark: boolean): Theme {
  if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  return prefersDark ? "dark" : "light";
}

export function nextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}
