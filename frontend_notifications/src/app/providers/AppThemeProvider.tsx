import { useMemo, type PropsWithChildren } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';

import { useAppSelector } from '../store';
import { createAppTheme } from '../../theme/theme';

export function AppThemeProvider({ children }: PropsWithChildren) {
  const colorMode = useAppSelector((state) => state.preferences.colorMode);

  const theme = useMemo(() => createAppTheme(colorMode), [colorMode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
