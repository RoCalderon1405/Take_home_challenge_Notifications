import { configureStore } from '@reduxjs/toolkit';

import { authReducer } from './auth.slice';
import {
  hydratePreferences,
  preferencesReducer,
  type PreferencesState,
} from './preferences.slice';

const PREFERENCES_KEY = 'notifications.preferences';

function loadPreferences(): PreferencesState | null {
  try {
    const raw = localStorage.getItem(PREFERENCES_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PreferencesState>;
    if (
      (parsed.colorMode === 'light' || parsed.colorMode === 'dark') &&
      (parsed.language === 'es' || parsed.language === 'en')
    ) {
      return parsed as PreferencesState;
    }
  } catch {
    // Corrupted preferences should never prevent the app from booting.
  }

  return null;
}

export const store = configureStore({
  reducer: {
    auth: authReducer,
    preferences: preferencesReducer,
  },
});

const storedPreferences = loadPreferences();
if (storedPreferences) {
  store.dispatch(hydratePreferences(storedPreferences));
}

store.subscribe(() => {
  try {
    localStorage.setItem(
      PREFERENCES_KEY,
      JSON.stringify(store.getState().preferences),
    );
  } catch {
    // Persistence is a progressive enhancement.
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
