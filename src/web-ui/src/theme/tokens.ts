const fontFamily = '"Plus Jakarta Sans", "Inter", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif';

export const themeTokens = {
  fontFamily,
  darkPalette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#f8fafc',
    },
    secondary: {
      main: '#a1a1aa',
      light: '#d4d4d8',
      dark: '#71717a',
      contrastText: '#09090b',
    },
    background: {
      default: '#09090b',
      paper: '#121214',
    },
    text: {
      primary: '#fafafa',
      secondary: '#a1a1aa',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
    error: {
      main: '#f87171',
    },
    warning: {
      main: '#fbbf24',
    },
    info: {
      main: '#60a5fa',
    },
    success: {
      main: '#4ade80',
    },
  },
  lightPalette: {
    mode: 'light',
    primary: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#52525b',
      light: '#71717a',
      dark: '#3f3f46',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f4f4f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#18181b',
      secondary: '#52525b',
    },
    divider: 'rgba(9, 9, 11, 0.1)',
  },
  typography: {
    fontFamily,
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  darkButtonTypography: {
    fontWeight: 600,
    letterSpacing: '0.04em',
  },
  shape: {
    borderRadius: 10,
  },
} as const;
