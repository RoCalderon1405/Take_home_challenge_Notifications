import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import { Prisma } from '@app/generated/prisma/client';

import { NotificationDeliveryTrackingService } from '../delivery-tracking';
import { DeliveryEventType, DeliveryStatus } from '../models';

export interface ResendWebhookHeaders {
  id?: string;
  timestamp?: string;
  signature?: string;
}

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ResendEventMapping {
  eventType: DeliveryEventType;
  targetStatus?: DeliveryStatus;
  errorMessage?: string;
}

/**
 * Verifies and normalizes Resend webhook events.
 *
 * Only the payload returned by Resend's signature verifier is processed.
 * Provider-specific data remains internal and is reduced to normalized
 * delivery events before it reaches application-facing APIs.
 */
@Injectable()
export class ResendWebhookService {
  private readonly resend = new Resend();

  constructor(
    private readonly configService: ConfigService,
    private readonly trackingService: NotificationDeliveryTrackingService,
  ) {}

  async handle(rawBody: Buffer, headers: ResendWebhookHeaders): Promise<void> {
    const webhookSecret = this.configService.get<string>(
      'RESEND_WEBHOOK_SECRET',
    );

    if (!webhookSecret) {
      throw new ServiceUnavailableException('Resend webhook is not configured');
    }

    if (!headers.id || !headers.timestamp || !headers.signature) {
      throw new BadRequestException('Missing Resend webhook signature headers');
    }

    const payload = rawBody.toString('utf8');

    let verified: unknown;

    try {
      verified = this.resend.webhooks.verify({
        payload,
        headers: {
          id: headers.id,
          timestamp: headers.timestamp,
          signature: headers.signature,
        },
        webhookSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid Resend webhook signature');
    }

    if (!this.isResendWebhookEvent(verified)) {
      throw new BadRequestException('Invalid Resend webhook payload');
    }

    const mapping = this.mapEvent(verified.type);

    // Contact/domain/inbound events are valid Resend events, but they are not
    // delivery updates for outbound notifications managed by this application.
    if (!mapping) {
      return;
    }

    const providerMessageId = this.readString(verified.data.email_id);

    if (!providerMessageId) {
      throw new BadRequestException('Resend email event is missing email_id');
    }

    const occurredAt = new Date(verified.created_at);

    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Resend webhook has an invalid created_at');
    }

    let rawPayload: Prisma.InputJsonValue;

    try {
      rawPayload = JSON.parse(payload) as Prisma.InputJsonValue;
    } catch {
      // A verified Resend payload should always be JSON. Treat anything else as
      // malformed instead of reconstructing a body that was not signed.
      throw new BadRequestException('Resend webhook payload is not valid JSON');
    }

    await this.trackingService.recordProviderEvent({
      provider: 'resend',
      providerMessageId,
      providerEventId: headers.id,
      eventType: mapping.eventType,
      occurredAt,
      payload: rawPayload,
      targetStatus: mapping.targetStatus,
      errorMessage: mapping.errorMessage,
    });
  }

  private mapEvent(type: string): ResendEventMapping | null {
    switch (type) {
      case 'email.sent':
        return {
          eventType: DeliveryEventType.SENT,
          targetStatus: DeliveryStatus.SENT,
        };

      case 'email.delivered':
        return {
          eventType: DeliveryEventType.DELIVERED,
          targetStatus: DeliveryStatus.DELIVERED,
        };

      case 'email.bounced':
        return {
          eventType: DeliveryEventType.BOUNCED,
          targetStatus: DeliveryStatus.FAILED,
          errorMessage: 'Resend reported that the email bounced',
        };

      case 'email.failed':
        return {
          eventType: DeliveryEventType.FAILED,
          targetStatus: DeliveryStatus.FAILED,
          errorMessage: 'Resend reported email delivery failure',
        };

      case 'email.suppressed':
        return {
          eventType: DeliveryEventType.SUPPRESSED,
          targetStatus: DeliveryStatus.FAILED,
          errorMessage: 'Resend suppressed the email',
        };

      case 'email.delivery_delayed':
        return {
          eventType: DeliveryEventType.DELAYED,
        };

      case 'email.complained':
        return {
          eventType: DeliveryEventType.COMPLAINED,
        };

      case 'email.opened':
        return {
          eventType: DeliveryEventType.OPENED,
        };

      case 'email.clicked':
        return {
          eventType: DeliveryEventType.CLICKED,
        };

      case 'email.scheduled':
        return {
          eventType: DeliveryEventType.QUEUED,
        };

      default:
        return null;
    }
  }

  private isResendWebhookEvent(value: unknown): value is ResendWebhookEvent {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const event = value as Record<string, unknown>;

    return (
      typeof event.type === 'string' &&
      typeof event.created_at === 'string' &&
      !!event.data &&
      typeof event.data === 'object' &&
      !Array.isArray(event.data)
    );
  }

  private readString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null;
  }
}
