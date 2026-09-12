import type { Request } from 'express';

import { GoogleOAuthStateStore } from './google-oauth-state.store';

describe('GoogleOAuthStateStore', () => {
  const request = {} as Request;
  const store = new GoogleOAuthStateStore('12345678901234567890123456789012');

  const createState = (): Promise<string> =>
    new Promise((resolve, reject) => {
      store.store(request, (error, state) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(String(state));
      });
    });

  const verifyState = (state: string): Promise<boolean> =>
    new Promise((resolve, reject) => {
      store.verify(request, state, (error, ok) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(ok);
      });
    });

  it('should generate and validate a signed OAuth state', async () => {
    const state = await createState();

    expect(state.split('.')).toHaveLength(2);
    await expect(verifyState(state)).resolves.toBe(true);
  });

  it('should reject a modified OAuth state', async () => {
    const state = await createState();
    const modified = `${state.slice(0, -1)}${state.endsWith('A') ? 'B' : 'A'}`;

    await expect(verifyState(modified)).resolves.toBe(false);
  });

  it('should reject a malformed OAuth state', async () => {
    await expect(verifyState('invalid')).resolves.toBe(false);
  });
});
