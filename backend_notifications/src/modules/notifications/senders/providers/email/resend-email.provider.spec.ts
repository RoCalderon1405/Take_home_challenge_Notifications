import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { ResendEmailProvider } from './resend-email.provider';

jest.mock('resend', () => ({
  Resend: jest.fn(),
}));

describe('ResendEmailProvider', () => {
  const resendSendMock = jest.fn();

  const config = {
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'Notifications <notifications@example.com>',
  };

  const configService = {
    getOrThrow: jest.fn((key: keyof typeof config) => config[key]),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (Resend as unknown as jest.Mock).mockImplementation(() => ({
      emails: {
        send: resendSendMock,
      },
    }));
  });

  it('should send an email through Resend and normalize the result', async () => {
    resendSendMock.mockResolvedValue({
      data: {
        id: 'resend-message-1',
      },
      error: null,
    });

    const provider = new ResendEmailProvider(
      configService as unknown as ConfigService,
    );

    const result = await provider.send({
      notificationId: 'notification-1',
      recipient: 'user@example.com',
      title: 'Hello',
      content: 'Email body',
    });

    expect(Resend).toHaveBeenCalledWith('re_test');
    expect(resendSendMock).toHaveBeenCalledWith({
      from: 'Notifications <notifications@example.com>',
      to: ['user@example.com'],
      subject: 'Hello',
      text: 'Email body',
    });

    expect(result).toEqual({
      provider: 'resend',
      providerMessageId: 'resend-message-1',
      providerResponse: {
        id: 'resend-message-1',
      },
    });
  });

  it('should throw when Resend returns an error', async () => {
    resendSendMock.mockResolvedValue({
      data: null,
      error: {
        message: 'Invalid API key',
      },
    });

    const provider = new ResendEmailProvider(
      configService as unknown as ConfigService,
    );

    await expect(
      provider.send({
        notificationId: 'notification-1',
        recipient: 'user@example.com',
        title: 'Hello',
        content: 'Email body',
      }),
    ).rejects.toThrow('Resend failed to send email: Invalid API key');
  });
});
