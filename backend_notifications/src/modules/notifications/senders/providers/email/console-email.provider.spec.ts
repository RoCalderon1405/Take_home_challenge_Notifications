import { ConsoleEmailProvider } from './console-email.provider';

describe('ConsoleEmailProvider', () => {
  it('should return a normalized simulated email result', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-08T20:00:00.000Z'));

    const provider = new ConsoleEmailProvider();

    const result = await provider.send({
      notificationId: 'notification-1',
      recipient: 'user@example.com',
      title: 'Hello',
      content: 'Email body',
    });

    expect(result).toEqual({
      provider: 'console-email',
      providerMessageId: 'console-email-notification-1-1788897600000',
      providerResponse: {
        accepted: true,
        recipient: 'user@example.com',
        title: 'Hello',
        contentLength: 10,
      },
    });

    jest.useRealTimers();
  });
});
