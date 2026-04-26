import { alpha } from '@mui/material/styles';

export const darkComponentOverrides = {
  MuiCssBaseline: {
    styleOverrides: {
      body: {
        backgroundColor: '#09090b',
        scrollbarWidth: 'thin',
        scrollbarColor: '#3f3f46 #18181b',
        '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
          width: 6,
          height: 6,
        },
        '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
          background: '#18181b',
        },
        '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
          backgroundColor: '#3f3f46',
          borderRadius: 8,
        },
        '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#52525b',
        },
      },
      '.MuiChartsTooltip-root .MuiPaper-root, .MuiChartsTooltip-paper': {
        backgroundColor: alpha('#121214', 0.9),
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'none',
        color: '#fafafa',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      },
      'input[type="datetime-local"]': {
        colorScheme: 'dark',
      },
      'input[type="datetime-local"]::-webkit-calendar-picker-indicator': {
        filter: 'invert(1) brightness(1.8) contrast(1.1)',
        opacity: 0.95,
        cursor: 'pointer',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.04em',
        padding: '6px 12px',
        borderRadius: 8,
        boxShadow: 'none',
      },
      contained: {
        boxShadow: 'none',
        '&:hover': {
          boxShadow: 'none',
        },
      },
    },
  },
  MuiPaper: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        borderRadius: 10,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'none',
      },
    },
  },
  MuiCard: {
    defaultProps: {
      elevation: 0,
    },
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        borderRadius: 10,
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'none',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
        boxShadow: 'none',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundImage: 'none',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      },
    },
  },
  MuiTableCell: {
    styleOverrides: {
      root: {
        fontSize: '0.95rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: {
        backgroundColor: alpha('#121214', 0.9),
        border: '1px solid rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      },
    },
  },
} as const;

export const lightComponentOverrides = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.04em',
        padding: '6px 12px',
        borderRadius: 8,
        boxShadow: 'none',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 10,
      },
    },
  },
} as const;
