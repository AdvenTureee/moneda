'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { flushSync } from 'react-dom';

export type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = 'moneda-theme';
const DEFAULT_THEME: ThemePreference = 'light';
const THEME_TRANSITION_CLASS = 'theme-transitioning';
const THEME_TRANSITION_MS = 360;
let themeTransitionTimer: number | null = null;

type ViewTransitionDocument = Document & {
  startViewTransition?: (updateCallback: () => void) => { finished: Promise<void> };
};

interface ThemeContextValue {
  theme: ThemePreference;
  isDark: boolean;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark';
}

function readStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // ignore
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ThemePreference) {
  document.documentElement.dataset.theme = theme;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function transitionTheme(nextTheme: ThemePreference, commit: () => void) {
  const update = () => {
    flushSync(commit);
    applyTheme(nextTheme);
  };

  if (typeof document === 'undefined' || prefersReducedMotion()) {
    update();
    return;
  }

  const root = document.documentElement;
  const viewTransition = (document as ViewTransitionDocument).startViewTransition;
  if (typeof viewTransition === 'function') {
    viewTransition.call(document, update);
    return;
  }

  if (themeTransitionTimer !== null) {
    window.clearTimeout(themeTransitionTimer);
  }
  root.classList.remove(THEME_TRANSITION_CLASS);
  // Force the class restart when toggling repeatedly.
  void root.offsetWidth;
  root.classList.add(THEME_TRANSITION_CLASS);
  update();

  themeTransitionTimer = window.setTimeout(() => {
    root.classList.remove(THEME_TRANSITION_CLASS);
    themeTransitionTimer = null;
  }, THEME_TRANSITION_MS);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(DEFAULT_THEME);

  useEffect(() => {
    const storedTheme = readStoredTheme();
    setThemeState(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    transitionTheme(nextTheme, () => setThemeState(nextTheme));
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Private browsing or storage restrictions should not block the UI.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    transitionTheme(nextTheme, () => setThemeState(nextTheme));
    try {
      window.localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // Private browsing or storage restrictions should not block the UI.
    }
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === 'dark',
      setTheme,
      toggleTheme,
    }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return context;
}
