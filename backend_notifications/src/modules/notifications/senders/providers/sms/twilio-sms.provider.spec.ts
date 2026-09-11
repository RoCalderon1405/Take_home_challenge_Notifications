import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

import { NotificationProviderError } from '../../errors/notification-provider.error';

import { TwilioSmsProvider } from './twilio-sms.provider';

jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('TwilioSmsProvider', () => {
  const createMessageMock = jest.fn();

  const config = {
    TWILIO_ACCOUNT_SID: 'AC123',
    TWILIO_API_KEY_SID: 'SK123',
    TWILIO_API_KEY_SECRET: 'twilio-api-key-secret',
    TWILIO_FROM_NUMBER: '+15551234567',
    PUBLIC_API_BASE_URL: 'https://api.example.com/',
  };

  const configService = {
    getOrThrow: jest.fn((key: keyof typeof config) => config[key]),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (twilio as unknown as jest.Mock).mockReturnValue({
      messages: {
        create: createMessageMock,
      },
    });
  });

  it('should send an SMS through Twilio and normalize the result', async () => {
    createMessageMock.mockResolvedValue({
      sid: 'SM123',
      status: 'queued',
      to: '+525551234567',
      from: '+15551234567',
      errorCode: null,
    });

    const provider = new TwilioSmsProvider(
      configService as unknown as ConfigService,
    );

    const result = await provider.send({
      notificationId: 'notification-1',
      recipient: '+525551234567',
      title: 'Alert',
      content: 'SMS body',
    });

    expect(twilio).toHaveBeenCalledWith('SK123', 'twilio-api-key-secret', {
      accountSid: 'AC123',
    });

    expect(createMessageMock).toHaveBeenCalledWith({
      to: '+525551234567',
      from: '+15551234567',
      body: 'Alert\nSMS body',
      statusCallback: 'https://api.example.com/api/webhooks/twilio/status',
    });

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
    createMessageMock.mockResolvedValue({
      sid: 'SM456',
      status: 'queued',
      to: '+525551234567',
      from: '+15551234567',
      errorCode: null,
    });

    const provider = new TwilioSmsProvider(
      configService as unknown as ConfigService,
    );

    await provider.send({
      notificationId: 'notification-1',
      recipient: '+525551234567',
      title: 'Alert',
      content: 'SMS body',
    });

    expect(createMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCallback: 'https://api.example.com/api/webhooks/twilio/status',
      }),
    );
  });

  it('should mark Twilio client errors as non-retryable', async () => {
    createMessageMock.mockRejectedValue({
      status: 400,
      code: 21211,
      message: 'The destination phone number is invalid',
    });

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
    createMessageMock.mockRejectedValue({
      status: 503,
      code: 20500,
      message: 'Internal server error',
    });

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
    createMessageMock.mockRejectedValue({
      status: 429,
      code: 20429,
      message: 'Too many requests',
    });

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
