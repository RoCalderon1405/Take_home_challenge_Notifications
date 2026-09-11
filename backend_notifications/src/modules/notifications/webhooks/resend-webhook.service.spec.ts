import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { NotificationDeliveryTrackingService } from '../delivery-tracking';
import { DeliveryEventType, DeliveryStatus } from '../models';

import { ResendWebhookService } from './resend-webhook.service';

jest.mock('resend', () => ({
  Resend: jest.fn(),
}));

describe('ResendWebhookService', () => {
  const webhookSecret = 'whsec_test_secret';

  const headers = {
    id: 'msg_webhook_1',
    timestamp: '1789051200',
    signature: 'v1,test-signature',
  };

  const verifyMock = jest.fn();

  const configServiceMock = {
    get: jest.fn(),
  };

  const trackingServiceMock = {
    recordProviderEvent: jest.fn(),
  };

  let service: ResendWebhookService;

  beforeEach(() => {
    jest.clearAllMocks();

    verifyMock.mockReset();
    configServiceMock.get.mockReturnValue(webhookSecret);
    trackingServiceMock.recordProviderEvent.mockResolvedValue({
      duplicate: false,
      stateChanged: true,
    });

    (Resend as unknown as jest.Mock).mockImplementation(() => ({
      webhooks: {
        verify: verifyMock,
      },
    }));

    service = new ResendWebhookService(
      configServiceMock as unknown as ConfigService,
      trackingServiceMock as unknown as NotificationDeliveryTrackingService,
    );
  });

  it('should reject the webhook when RESEND_WEBHOOK_SECRET is not configured', async () => {
    configServiceMock.get.mockReturnValue(undefined);

    await expect(
      service.handle(Buffer.from('{}'), headers),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(verifyMock).not.toHaveBeenCalled();
    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject a webhook when signature headers are missing', async () => {
    await expect(
      service.handle(Buffer.from('{}'), {
        id: headers.id,
        timestamp: headers.timestamp,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(verifyMock).not.toHaveBeenCalled();
    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject a webhook when Resend signature verification fails', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await expect(
      service.handle(Buffer.from('{}'), headers),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should normalize an email.delivered event and forward it to delivery tracking', async () => {
    const event = {
      type: 'email.delivered',
      created_at: '2026-09-10T12:00:00.000Z',
      data: {
        email_id: 'resend-message-1',
        to: ['user@example.com'],
      },
    };

    const payload = JSON.stringify(event);

    verifyMock.mockReturnValue(event);

    await service.handle(Buffer.from(payload), headers);

    expect(configServiceMock.get).toHaveBeenCalledWith('RESEND_WEBHOOK_SECRET');

    expect(verifyMock).toHaveBeenCalledWith({
      payload,
      headers: {
        id: headers.id,
        timestamp: headers.timestamp,
        signature: headers.signature,
      },
      webhookSecret,
    });

    expect(trackingServiceMock.recordProviderEvent).toHaveBeenCalledWith({
      provider: 'resend',
      providerMessageId: 'resend-message-1',
      providerEventId: headers.id,
      eventType: DeliveryEventType.DELIVERED,
      occurredAt: new Date('2026-09-10T12:00:00.000Z'),
      payload: event,
      targetStatus: DeliveryStatus.DELIVERED,
      errorMessage: undefined,
    });
  });

  it('should normalize an email.bounced event as a failed delivery', async () => {
    const event = {
      type: 'email.bounced',
      created_at: '2026-09-10T12:05:00.000Z',
      data: {
        email_id: 'resend-message-2',
      },
    };

    verifyMock.mockReturnValue(event);

    await service.handle(Buffer.from(JSON.stringify(event)), headers);

    expect(trackingServiceMock.recordProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'resend',
        providerMessageId: 'resend-message-2',
        providerEventId: headers.id,
        eventType: DeliveryEventType.BOUNCED,
        targetStatus: DeliveryStatus.FAILED,
        errorMessage: 'Resend reported that the email bounced',
      }),
    );
  });

  it('should persist email.complained as an interaction event without changing transport status', async () => {
    const event = {
      type: 'email.complained',
      created_at: '2026-09-10T12:10:00.000Z',
      data: {
        email_id: 'resend-message-3',
      },
    };

    verifyMock.mockReturnValue(event);

    await service.handle(Buffer.from(JSON.stringify(event)), headers);

    expect(trackingServiceMock.recordProviderEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'resend',
        providerMessageId: 'resend-message-3',
        eventType: DeliveryEventType.COMPLAINED,
        targetStatus: undefined,
        errorMessage: undefined,
      }),
    );
  });

  it('should ignore valid Resend events that are unrelated to outbound delivery tracking', async () => {
    const event = {
      type: 'domain.updated',
      created_at: '2026-09-10T12:15:00.000Z',
      data: {
        id: 'domain-1',
      },
    };

    verifyMock.mockReturnValue(event);

    await expect(
      service.handle(Buffer.from(JSON.stringify(event)), headers),
    ).resolves.toBeUndefined();

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject a mapped email event when email_id is missing', async () => {
    const event = {
      type: 'email.delivered',
      created_at: '2026-09-10T12:20:00.000Z',
      data: {},
    };

    verifyMock.mockReturnValue(event);

    await expect(
      service.handle(Buffer.from(JSON.stringify(event)), headers),
    ).rejects.toThrow('Resend email event is missing email_id');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject a mapped email event with an invalid created_at value', async () => {
    const event = {
      type: 'email.delivered',
      created_at: 'not-a-date',
      data: {
        email_id: 'resend-message-4',
      },
    };

    verifyMock.mockReturnValue(event);

    await expect(
      service.handle(Buffer.from(JSON.stringify(event)), headers),
    ).rejects.toThrow('Resend webhook has an invalid created_at');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject a verified payload that does not have the expected event shape', async () => {
    verifyMock.mockReturnValue({
      unexpected: true,
    });

    await expect(
      service.handle(
        Buffer.from(JSON.stringify({ unexpected: true })),
        headers,
      ),
    ).rejects.toThrow('Invalid Resend webhook payload');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });
});
