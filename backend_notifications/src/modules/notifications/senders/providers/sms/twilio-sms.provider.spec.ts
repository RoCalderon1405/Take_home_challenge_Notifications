import { ConfigService } from '@nestjs/config';

import { NotificationProviderError } from '../../errors/notification-provider.error';

import { TwilioSmsProvider } from './twilio-sms.provider';

const createJsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

describe('TwilioSmsProvider', () => {
  const originalFetch = globalThis.fetch;

  const fetchMock = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >();

  const config = {
    TWILIO_ACCOUNT_SID: 'AC123',
    TWILIO_API_KEY_SID: 'SK123',
    TWILIO_API_KEY_SECRET: 'twilio-api-key-secret',
    TWILIO_FROM_NUMBER: '+15551234567',
  };

  const configService = {
    getOrThrow: jest.fn((key: keyof typeof config) => config[key]),
    get: jest.fn(),
  };

  beforeAll(() => {
    globalThis.fetch = fetchMock;
  });

  beforeEach(() => {
    fetchMock.mockReset();

    configService.getOrThrow.mockClear();
    configService.get.mockReset();
    configService.get.mockReturnValue(undefined);
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('should send an SMS through Twilio and normalize the result', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          sid: 'SM123',
          status: 'queued',
          to: '+525551234567',
          from: '+15551234567',
          error_code: null,
        },
        201,
      ),
    );

    const provider = new TwilioSmsProvider(
      configService as unknown as ConfigService,
    );

    const result = await provider.send({
      notificationId: 'notification-1',
      recipient: '+525551234567',
      title: 'Alert',
      content: 'SMS body',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe(
      'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json',
    );

    expect(options).toBeDefined();

    if (!options) {
      throw new Error('Expected Twilio request options');
    }

    expect(options.method).toBe('POST');

    const expectedAuthorization = `Basic ${Buffer.from(
      'SK123:twilio-api-key-secret',
    ).toString('base64')}`;

    expect(options.headers).toEqual(
      expect.objectContaining({
        Authorization: expectedAuthorization,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      }),
    );

    if (!(options.body instanceof URLSearchParams)) {
      throw new Error('Expected Twilio request body to be URLSearchParams');
    }

    expect(options.body.get('To')).toBe('+525551234567');
    expect(options.body.get('From')).toBe('+15551234567');
    expect(options.body.get('Body')).toBe('Alert\nSMS body');

    expect(options.body.get('StatusCallback')).toBeNull();

    expect(result).toEqual({
      provider: 'twilio',
      providerMessageId: 'SM123',
      providerResponse: {
        sid: 'SM123',
        status: 'queued',
        to: '+525551234567',
        from: '+15551234567',
        errorCode: null,
      },
    });
  });

  it('should include the configured status callback URL', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'PUBLIC_API_BASE_URL' ? 'https://api.example.com/' : undefined,
    );

    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          sid: 'SM456',
          status: 'queued',
          to: '+525551234567',
          from: '+15551234567',
          error_code: null,
        },
        201,
      ),
    );

    const provider = new TwilioSmsProvider(
      configService as unknown as ConfigService,
    );

    await provider.send({
      notificationId: 'notification-1',
      recipient: '+525551234567',
      title: 'Alert',
      content: 'SMS body',
    });

    const [, options] = fetchMock.mock.calls[0];

    if (!options || !(options.body instanceof URLSearchParams)) {
      throw new Error('Expected Twilio request body to be URLSearchParams');
    }

    expect(options.body.get('StatusCallback')).toBe(
      'https://api.example.com/api/webhooks/twilio/status',
    );
  });

  it('should mark Twilio client errors as non-retryable', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          code: 21211,
          message: 'The destination phone number is invalid',
        },
        400,
      ),
    );

    const provider = new TwilioSmsProvider(
      configService as unknown as ConfigService,
    );

    try {
      await provider.send({
        notificationId: 'notification-1',
        recipient: 'invalid',
        title: 'Alert',
        content: 'SMS body',
      });

      throw new Error('Expected provider to throw');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(NotificationProviderError);

      expect(error).toMatchObject({
        provider: 'twilio',
        retryable: false,
        providerCode: 21211,
        message:
          'Twilio failed to send SMS: The destination phone number is invalid',
      });
    }
  });

  it('should mark Twilio server errors as retryable', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          code: 20500,
          message: 'Internal server error',
        },
        503,
      ),
    );

    const provider = new TwilioSmsProvider(
      configService as unknown as ConfigService,
    );

    try {
      await provider.send({
        notificationId: 'notification-1',
        recipient: '+525551234567',
        title: 'Alert',
        content: 'SMS body',
      });

      throw new Error('Expected provider to throw');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        name: 'NotificationProviderError',
        provider: 'twilio',
        retryable: true,
        providerCode: 20500,
      });
    }
  });

  it('should mark Twilio rate-limit responses as non-retryable for the current queue policy', async () => {
    fetchMock.mockResolvedValue(
      createJsonResponse(
        {
          code: 20429,
          message: 'Too many requests',
        },
        429,
      ),
    );

    const provider = new TwilioSmsProvider(
      configService as unknown as ConfigService,
    );

    try {
      await provider.send({
        notificationId: 'notification-1',
        recipient: '+525551234567',
        title: 'Alert',
        content: 'SMS body',
      });

      throw new Error('Expected provider to throw');
    } catch (error: unknown) {
      expect(error).toMatchObject({
        provider: 'twilio',
        retryable: false,
        providerCode: 20429,
      });
    }
  });
});
