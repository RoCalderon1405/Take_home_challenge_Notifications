import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ColorMode = 'light' | 'dark';
export type AppLanguage = 'es' | 'en';

export interface PreferencesState {
  colorMode: ColorMode;
  language: AppLanguage;
}

const initialState: PreferencesState = {
  colorMode: 'dark',
  language: 'es',
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    hydratePreferences(_state, action: PayloadAction<PreferencesState>) {
      return action.payload;
    },
    toggleColorMode(state) {
      state.colorMode = state.colorMode === 'light' ? 'dark' : 'light';
    },
    setLanguage(state, action: PayloadAction<AppLanguage>) {
      state.language = action.payload;
    },
  },
});

export const { hydratePreferences, setLanguage, toggleColorMode } =
  preferencesSlice.actions;
export const preferencesReducer = preferencesSlice.reducer;
