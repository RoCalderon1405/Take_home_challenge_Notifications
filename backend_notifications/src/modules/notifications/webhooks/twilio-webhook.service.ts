import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Prisma } from '@app/generated/prisma/client';

import { NotificationDeliveryTrackingService } from '../delivery-tracking';
import { DeliveryEventType, DeliveryStatus } from '../models';
import {
  TwilioFormParameters,
  TwilioFormValue,
  TwilioRequestValidatorService,
} from './twilio-request-validator.service';

interface TwilioEventMapping {
  eventType: DeliveryEventType;
  targetStatus?: DeliveryStatus;
}

/** Verifies and normalizes Twilio Programmable Messaging status callbacks. */
@Injectable()
export class TwilioWebhookService {
  constructor(
    private readonly configService: ConfigService,
    private readonly validator: TwilioRequestValidatorService,
    private readonly trackingService: NotificationDeliveryTrackingService,
  ) {}

  async handle(
    signature: string | undefined,
    requestUrl: string,
    body: unknown,
  ): Promise<void> {
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (!authToken) {
      throw new ServiceUnavailableException('Twilio webhook is not configured');
    }

    if (!signature) {
      throw new UnauthorizedException('Missing Twilio webhook signature');
    }

    const params = this.toFormParameters(body);

    if (!this.validator.validate(authToken, signature, requestUrl, params)) {
      throw new UnauthorizedException('Invalid Twilio webhook signature');
    }

    const messageSid = this.requireString(params.MessageSid, 'MessageSid');
    const messageStatus = this.requireString(
      params.MessageStatus,
      'MessageStatus',
    ).toLowerCase();

    const mapping = this.mapStatus(messageStatus);
    const errorCode = this.optionalString(params.ErrorCode);
    const errorMessage = this.optionalString(params.ErrorMessage);

    const payload = this.toJsonPayload(params);

    await this.trackingService.recordProviderEvent({
      provider: 'twilio',
      providerMessageId: messageSid,
      providerEventId: `twilio:${messageSid}:${messageStatus}`,
      eventType: mapping.eventType,
      occurredAt: new Date(),
      payload,
      targetStatus: mapping.targetStatus,
      errorMessage:
        mapping.targetStatus === DeliveryStatus.FAILED
          ? (errorMessage ??
            (errorCode
              ? `Twilio reported delivery failure (${errorCode})`
              : 'Twilio reported delivery failure'))
          : undefined,
    });
  }

  private mapStatus(status: string): TwilioEventMapping {
    switch (status) {
      case 'accepted':
      case 'queued':
        return {
          eventType: DeliveryEventType.QUEUED,
          targetStatus: DeliveryStatus.SENT,
        };

      case 'sending':
        return {
          eventType: DeliveryEventType.SENDING,
          targetStatus: DeliveryStatus.SENT,
        };

      case 'sent':
        return {
          eventType: DeliveryEventType.SENT,
          targetStatus: DeliveryStatus.SENT,
        };

      case 'delivered':
        return {
          eventType: DeliveryEventType.DELIVERED,
          targetStatus: DeliveryStatus.DELIVERED,
        };

      case 'failed':
      case 'undelivered':
        return {
          eventType: DeliveryEventType.FAILED,
          targetStatus: DeliveryStatus.FAILED,
        };

      case 'canceled':
        return {
          eventType: DeliveryEventType.CANCELED,
          targetStatus: DeliveryStatus.FAILED,
        };

      default:
        return {
          eventType: DeliveryEventType.UNKNOWN,
        };
    }
  }

  private toFormParameters(value: unknown): TwilioFormParameters {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Invalid Twilio webhook body');
    }

    const result: TwilioFormParameters = {};

    for (const [key, rawValue] of Object.entries(value)) {
      if (typeof rawValue === 'string') {
        result[key] = rawValue;
        continue;
      }

      if (
        Array.isArray(rawValue) &&
        rawValue.every((item) => typeof item === 'string')
      ) {
        result[key] = rawValue;
        continue;
      }

      throw new BadRequestException(`Invalid Twilio webhook parameter: ${key}`);
    }

    return result;
  }

  private requireString(
    value: TwilioFormValue | undefined,
    field: string,
  ): string {
    const parsed = this.optionalString(value);

    if (!parsed) {
      throw new BadRequestException(`Twilio webhook is missing ${field}`);
    }

    return parsed;
  }

  private optionalString(value: TwilioFormValue | undefined): string | null {
    if (typeof value === 'string') {
      return value.length > 0 ? value : null;
    }

    if (Array.isArray(value) && value.length === 1 && value[0].length > 0) {
      return value[0];
    }

    return null;
  }

  private toJsonPayload(params: TwilioFormParameters): Prisma.InputJsonValue {
    return Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, value]),
    );
  }
}
