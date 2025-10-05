import React, { createContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// mode: 'light' | 'dark' | 'system'
export const ColorModeContext = createContext({
  mode: 'light',
  effectiveMode: 'light',
  toggleColorMode: () => {},
  // Accepts 'light' | 'dark' | 'system'
  setMode: (_m) => {},
});

export function ColorModeProvider({ children }) {
  const initial = () => {
    try {
      const saved = localStorage.getItem('theme_mode');
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch (_) {}
    return 'light';
  };

  const [mode, setMode] = useState(initial);
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    try { localStorage.setItem('theme_mode', mode); } catch (_) {}
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e) => setSystemDark(e.matches);
    if (mql.addEventListener) mql.addEventListener('change', listener);
    else mql.addListener(listener);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', listener);
      else mql.removeListener(listener);
    };
  }, []);

  const effectiveMode = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode;

  const theme = useMemo(() => createTheme({
    palette: {
      // Cast to satisfy TS palette mode type when linting JS
      mode: /** @type {'light' | 'dark'} */ (effectiveMode),
      background: { default: effectiveMode === 'dark' ? '#0a0a0a' : '#ffffff' },
      primary: { main: '#1976d2' },
      secondary: { main: '#ff9800' },
    },
    components: {
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
    },
  }), [effectiveMode]);

  const toggleColorMode = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'));
  };

  return (
    <ColorModeContext.Provider value={{ mode, effectiveMode, toggleColorMode, setMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
