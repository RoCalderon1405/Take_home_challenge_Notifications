import { useState, type PropsWithChildren } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import { store } from '../store';
import { AppThemeProvider } from './AppThemeProvider';
import { AuthBootstrap } from './AuthBootstrap';
import { LanguageSync } from './LanguageSync';
import { PushForegroundListener } from './PushForegroundListener';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <ReduxProvider store={store}>
      <AppThemeProvider>
        <QueryClientProvider client={queryClient}>
          <LanguageSync />
          <AuthBootstrap />
          <PushForegroundListener />
          {children}
        </QueryClientProvider>
      </AppThemeProvider>
    </ReduxProvider>
  );
}
