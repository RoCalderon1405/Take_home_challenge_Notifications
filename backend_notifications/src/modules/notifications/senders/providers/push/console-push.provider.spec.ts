import { ConsolePushProvider } from './console-push.provider';

describe('ConsolePushProvider', () => {
  it('should return a normalized simulated Push result', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-08T20:00:00.000Z'));

    const provider = new ConsolePushProvider();

    const result = await provider.send({
      notificationId: 'notification-1',
      recipient: 'device-token',
      title: 'Alert',
      content: 'Push body',
    });

    expect(result.provider).toBe('console-push');
    expect(result.providerMessageId).toBe(
      'console-push-notification-1-1788897600000',
    );
    expect(result.providerResponse).toEqual({
      accepted: true,
      recipient: 'device-token',
      title: 'Alert',
      contentLength: 9,
    });

    jest.useRealTimers();
  });
});
