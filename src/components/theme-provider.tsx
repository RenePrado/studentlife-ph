"use client";

import * as React from "react";
import { useServerInsertedHTML } from "next/navigation";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "slph-theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // ignore
  }
  return "system";
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
}) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState<ResolvedTheme>(
    defaultTheme === "system" ? "light" : defaultTheme,
  );
  const mounted = React.useRef(false);

  // Inject no-FOUC script into <head> outside the React tree.
  // This runs on the server during SSR and is inserted before hydration,
  // so the correct theme class is set before React renders anything.
  useServerInsertedHTML(() => {
    const script = `
(function() {
  try {
    var key = ${JSON.stringify(STORAGE_KEY)};
    var stored = localStorage.getItem(key);
    var theme = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : ${JSON.stringify(defaultTheme)};
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
    if (resolved === 'dark') document.documentElement.classList.add('dark');
    ${disableTransitionOnChange ? "document.documentElement.style.colorScheme = resolved;" : ""}
  } catch (e) {}
})();`;
    return <script dangerouslySetInnerHTML={{ __html: script }} />;
  });

  // On mount: read stored theme and apply it
  React.useEffect(() => {
    const stored = getStoredTheme();
    const effectiveTheme = enableSystem ? stored : stored === "system" ? "light" : stored;
    setThemeState(effectiveTheme);
    const resolved = resolveTheme(effectiveTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    mounted.current = true;
  }, [enableSystem]);

  // Listen for system theme changes when in "system" mode
  React.useEffect(() => {
    if (!mounted.current || theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    const effective = enableSystem ? next : next === "system" ? "light" : next;
    const resolved = resolveTheme(effective);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, [enableSystem]);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
