import { ConfigService } from '@nestjs/config';

import { generateKeyPairSync } from 'node:crypto';

import { NotificationProviderError } from '../../errors/notification-provider.error';

import { FirebasePushProvider } from './firebase-push.provider';

const createJsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,

    headers: {
      'Content-Type': 'application/json',
    },
  });

describe('FirebasePushProvider', () => {
  const originalFetch = globalThis.fetch;

  const fetchMock = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >();

  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,

    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },

    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const config = {
    FIREBASE_PROJECT_ID: 'notifications-project',

    FIREBASE_CLIENT_EMAIL: 'firebase@example.com',

    FIREBASE_PRIVATE_KEY: privateKey,
  };

  const configService = {
    getOrThrow: jest.fn((key: keyof typeof config) => config[key]),
  };

  beforeAll(() => {
    globalThis.fetch = fetchMock;
  });

  beforeEach(() => {
    fetchMock.mockReset();

    configService.getOrThrow.mockClear();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('should obtain an OAuth token, send through FCM using a FID and reuse the token', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            access_token: 'access-token',

            expires_in: 3600,
          },
          200,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            name: 'projects/notifications-project/messages/message-1',
          },
          200,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            name: 'projects/notifications-project/messages/message-2',
          },
          200,
        ),
      );

    const provider = new FirebasePushProvider(
      configService as unknown as ConfigService,
    );

    const firstResult = await provider.send({
      notificationId: 'notification-1',

      recipient: 'firebase-installation-id-1',

      title: 'Alert',

      content: 'Push body',
    });

    const secondResult = await provider.send({
      notificationId: 'notification-2',

      recipient: 'firebase-installation-id-2',

      title: 'Alert 2',

      content: 'Push body 2',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://oauth2.googleapis.com/token',
    );

    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://fcm.googleapis.com/v1/projects/notifications-project/messages:send',
    );

    const firstFcmOptions = fetchMock.mock.calls[1][1];

    expect(firstFcmOptions).toBeDefined();

    if (!firstFcmOptions) {
      throw new Error('Expected Firebase request options');
    }

    expect(firstFcmOptions.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer access-token',
      }),
    );

    if (typeof firstFcmOptions.body !== 'string') {
      throw new Error('Expected Firebase request body to be a JSON string');
    }

    const parsedBody: unknown = JSON.parse(firstFcmOptions.body);

    expect(parsedBody).toEqual({
      message: {
        fid: 'firebase-installation-id-1',

        notification: {
          title: 'Alert',

          body: 'Push body',
        },

        data: {
          notificationId: 'notification-1',
        },
      },
    });

    expect(firstResult).toEqual({
      provider: 'firebase',

      providerMessageId: 'projects/notifications-project/messages/message-1',

      providerResponse: {
        name: 'projects/notifications-project/messages/message-1',
      },
    });

    expect(secondResult.providerMessageId).toBe(
      'projects/notifications-project/messages/message-2',
    );
  });

  it('should mark invalid OAuth credentials as non-retryable', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          error: 'invalid_grant',

          error_description: 'Invalid service account credentials',
        },
        401,
      ),
    );

    const provider = new FirebasePushProvider(
      configService as unknown as ConfigService,
    );

    try {
      await provider.send({
        notificationId: 'notification-1',

        recipient: 'firebase-installation-id',

        title: 'Alert',

        content: 'Push body',
      });

      throw new Error('Expected provider to throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(NotificationProviderError);

      expect(error).toMatchObject({
        provider: 'firebase',

        retryable: false,

        providerCode: 401,

        message:
          'Firebase OAuth token request failed: Invalid service account credentials',
      });
    }
  });

  it('should mark invalid FCM requests as non-retryable', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            access_token: 'access-token',

            expires_in: 3600,
          },
          200,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              code: 400,

              status: 'INVALID_ARGUMENT',

              message: 'Invalid Firebase Installation ID',
            },
          },
          400,
        ),
      );

    const provider = new FirebasePushProvider(
      configService as unknown as ConfigService,
    );

    try {
      await provider.send({
        notificationId: 'notification-1',

        recipient: 'invalid-fid',

        title: 'Alert',

        content: 'Push body',
      });

      throw new Error('Expected provider to throw');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        name: 'NotificationProviderError',

        provider: 'firebase',

        retryable: false,

        providerCode: 400,

        message:
          'Firebase failed to send push notification: Invalid Firebase Installation ID',
      });
    }
  });

  it('should mark FCM server errors as retryable', async () => {
    fetchMock
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            access_token: 'access-token',

            expires_in: 3600,
          },
          200,
        ),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              code: 503,

              status: 'UNAVAILABLE',

              message: 'Service temporarily unavailable',
            },
          },
          503,
        ),
      );

    const provider = new FirebasePushProvider(
      configService as unknown as ConfigService,
    );

    try {
      await provider.send({
        notificationId: 'notification-1',

        recipient: 'firebase-installation-id',

        title: 'Alert',

        content: 'Push body',
      });

      throw new Error('Expected provider to throw');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        name: 'NotificationProviderError',

        provider: 'firebase',

        retryable: true,

        providerCode: 503,
      });
    }
  });
});
