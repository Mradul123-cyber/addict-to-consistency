import { useCallback, useEffect, useState } from "react";

const THEME_STORAGE_KEY = "theme";

function readStoredDark(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark";
}

function applyDarkClass(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [isDark, setIsDark] = useState(readStoredDark);

  useEffect(() => {
    applyDarkClass(isDark);
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
      applyDarkClass(next);
      return next;
    });
  }, []);

  return { isDark, toggleTheme };
}
