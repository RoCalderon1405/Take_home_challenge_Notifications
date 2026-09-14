import { createTheme } from '@mui/material/styles';

import type { ColorMode } from '../app/store/preferences.slice';
import { createPalette } from './palette';

export function createAppTheme(mode: ColorMode) {
  return createTheme({
    palette: createPalette(mode),
    shape: {
      borderRadius: 14,
    },
    typography: {
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.04em' },
      h5: { fontWeight: 760, letterSpacing: '-0.025em' },
      h6: { fontWeight: 740, letterSpacing: '-0.02em' },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: mode === 'dark' ? '#2a3850 #07111f' : '#b7c3d3 #f4f7fb',
          },
          '*::selection': {
            backgroundColor: mode === 'dark' ? 'rgba(120,109,255,0.34)' : 'rgba(49,95,239,0.20)',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 10,
            minHeight: 40,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: ({ theme }) => ({
            border: '1px solid',
            borderColor: theme.palette.divider,
            borderRadius: 16,
            backgroundImage: 'none',
            boxShadow:
              theme.palette.mode === 'dark'
                ? '0 18px 48px rgba(0, 0, 0, 0.18)'
                : '0 18px 48px rgba(23, 43, 77, 0.06)',
          }),
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            backgroundColor:
              theme.palette.mode === 'dark'
                ? 'rgba(255,255,255,0.025)'
                : 'rgba(255,255,255,0.9)',
          }),
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 10,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 44,
            textTransform: 'none',
            fontWeight: 700,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 650,
          },
        },
      },
    },
  });
}
