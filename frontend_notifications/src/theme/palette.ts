import type { PaletteOptions } from '@mui/material/styles';

import type { ColorMode } from '../app/store/preferences.slice';

export function createPalette(mode: ColorMode): PaletteOptions {
  const dark = mode === 'dark';

  return {
    mode,
    primary: {
      main: dark ? '#786dff' : '#315fef',
      light: dark ? '#a59eff' : '#6e8bff',
      dark: dark ? '#5c50df' : '#2349c7',
    },
    secondary: {
      main: dark ? '#6a9fff' : '#4e72d8',
    },
    background: {
      default: dark ? '#07111f' : '#f4f7fb',
      paper: dark ? '#0d1929' : '#ffffff',
    },
    text: {
      primary: dark ? '#f3f6fb' : '#12213c',
      secondary: dark ? '#93a2b8' : '#687790',
    },
    divider: dark ? 'rgba(145,162,190,0.14)' : 'rgba(35,58,97,0.10)',
    action: {
      hover: dark ? 'rgba(255,255,255,0.045)' : 'rgba(30,68,120,0.045)',
      selected: dark ? 'rgba(111,99,255,0.14)' : 'rgba(49,95,239,0.10)',
    },
    success: { main: '#2cc979' },
    warning: { main: '#f1aa30' },
    error: { main: '#f35d71' },
    info: { main: '#4d91ff' },
  };
}
