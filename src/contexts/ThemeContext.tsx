import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

type ResolvedTheme = 'light' | 'dark';
type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** The effective theme after resolving 'system' */
  theme: ResolvedTheme;
  /** The raw user preference (light | dark | system) */
  preference: ThemePreference;
  toggleTheme: () => void; // cycles light <-> dark only
  setPreference: (pref: ThemePreference) => void;
  setThemeDirect: (t: ResolvedTheme) => void; // internal / direct override
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'chanterelle.theme'; // stores only explicit light/dark. Absence => system

function detectSystem(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (_) { /* ignore */ }
  return 'system';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(() => getInitialPreference());
  const [theme, setTheme] = useState<ResolvedTheme>(() => {
    const pref = getInitialPreference();
    return pref === 'system' ? detectSystem() : pref;
  });
  const mqlRef = useRef<MediaQueryList | null>(null);

  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    const root = document.documentElement;
    if (resolved === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  }, []);

  // Initialize media listener once
  useEffect(() => {
    if (typeof window === 'undefined') return;
    mqlRef.current = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      setTheme(prev => {
        if (preference === 'system') {
          const sys = detectSystem();
          applyTheme(sys);
          return sys;
        }
        return prev;
      });
    };
    mqlRef.current.addEventListener('change', handler);
    return () => mqlRef.current?.removeEventListener('change', handler);
  }, [preference, applyTheme]);

  // React to preference changes
  useEffect(() => {
    let resolved: ResolvedTheme;
    if (preference === 'system') {
      resolved = detectSystem();
      try { localStorage.removeItem(THEME_STORAGE_KEY); } catch(_) {}
    } else {
      resolved = preference;
      try { localStorage.setItem(THEME_STORAGE_KEY, preference); } catch(_) {}
    }
    setTheme(resolved);
    applyTheme(resolved);
  }, [preference, applyTheme]);

  const setPreference = useCallback((pref: ThemePreference) => setPreferenceState(pref), []);
  const toggleTheme = useCallback(() => {
    // If user is on system, derive from currently resolved theme so toggle feels natural.
    setPreferenceState(prev => {
      if (prev === 'system') {
        // Flip based on resolved theme value (theme state) to give deterministic toggle.
        return theme === 'dark' ? 'light' : 'dark';
      }
      return prev === 'light' ? 'dark' : 'light';
    });
  }, [theme]);
  const setThemeDirect = useCallback((t: ResolvedTheme) => {
    setPreferenceState(t); // direct assignment sets preference explicitly
  }, []);

  const value: ThemeContextValue = {
    theme,
    preference,
    toggleTheme,
    setPreference,
    setThemeDirect
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
