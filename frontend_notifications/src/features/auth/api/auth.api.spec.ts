import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { env } from '../../../config/env';
import { server } from '../../../test/server';
import { authApi } from './auth.api';

describe('authApi', () => {
  it('maps the credential request to the backend login endpoint', async () => {
    server.use(
      http.post(`${env.apiUrl}/auth/login`, async ({ request }) => {
        const body = (await request.json()) as { email: string; password: string };

        expect(body).toEqual({
          email: 'user@example.com',
          password: 'Password123!',
        });

        return HttpResponse.json({
          user: {
            id: 'user-1',
            email: 'user@example.com',
            status: 'ACTIVE',
            role: 'USER',
            createdAt: '2026-09-12T00:00:00.000Z',
            updatedAt: '2026-09-12T00:00:00.000Z',
          },
          accessToken: 'test-token',
        });
      }),
    );

    const response = await authApi.login({
      email: 'user@example.com',
      password: 'Password123!',
    });

    expect(response.accessToken).toBe('test-token');
    expect(response.user.email).toBe('user@example.com');
  });
});
