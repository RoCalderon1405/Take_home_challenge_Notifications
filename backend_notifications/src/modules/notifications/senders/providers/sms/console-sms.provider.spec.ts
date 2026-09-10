import { ConsoleSmsProvider } from './console-sms.provider';

describe('ConsoleSmsProvider', () => {
  it('should return a normalized simulated SMS result', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-08T20:00:00.000Z'));

    const provider = new ConsoleSmsProvider();

    const result = await provider.send({
      notificationId: 'notification-1',
      recipient: '+525551234567',
      title: 'Alert',
      content: 'SMS body',
    });

    expect(result.provider).toBe('console-sms');
    expect(result.providerMessageId).toBe(
      'console-sms-notification-1-1788897600000',
    );
    expect(result.providerResponse).toEqual({
      accepted: true,
      recipient: '+525551234567',
      contentLength: 8,
    });

    jest.useRealTimers();
  });
});
