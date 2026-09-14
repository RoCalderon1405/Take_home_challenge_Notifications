import { env } from '../../config/env';

const TOKEN_KEY = 'notifications.accessToken';

export const tokenStorage = {
  get(): string | null {
    if (env.authTransport !== 'bearer') {
      return null;
    }

    return sessionStorage.getItem(TOKEN_KEY);
  },

  set(token: string | undefined): void {
    if (env.authTransport !== 'bearer' || !token) {
      return;
    }

    sessionStorage.setItem(TOKEN_KEY, token);
  },

  clear(): void {
    sessionStorage.removeItem(TOKEN_KEY);
  },
};
