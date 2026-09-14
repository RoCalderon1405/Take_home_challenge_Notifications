import { describe, expect, it } from 'vitest';

import { preferencesReducer, setLanguage, toggleColorMode } from './preferences.slice';

describe('preferencesReducer', () => {
  it('toggles the color mode', () => {
    const lightState = preferencesReducer(undefined, toggleColorMode());
    expect(lightState.colorMode).toBe('light');

    const darkState = preferencesReducer(lightState, toggleColorMode());
    expect(darkState.colorMode).toBe('dark');
  });

  it('changes the UI language', () => {
    const state = preferencesReducer(undefined, setLanguage('en'));
    expect(state.language).toBe('en');
  });
});
