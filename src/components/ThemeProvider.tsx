import { useCallback, useLayoutEffect, useState } from "react";
import { applyTheme, nextTheme, resolveTheme, THEME_STORAGE_KEY } from "@/lib/theme";
import { ThemeContext, type Theme } from "./theme-context";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    const initialTheme = resolveTheme(
      window.localStorage.getItem(THEME_STORAGE_KEY),
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
    applyTheme(initialTheme);
    setTheme(initialTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = nextTheme(current);
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}
