import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  NotificationDeliveryTrackingService,
  type RecordDeliveryEventInput,
  type RecordDeliveryEventResult,
} from '../delivery-tracking';
import { DeliveryEventType, DeliveryStatus } from '../models';

import {
  TwilioRequestValidatorService,
  type TwilioFormParameters,
} from './twilio-request-validator.service';
import { TwilioWebhookService } from './twilio-webhook.service';

describe('TwilioWebhookService', () => {
  const authToken = 'test-auth-token';
  const signature = 'valid-signature';
  const requestUrl = 'https://api.example.com/api/webhooks/twilio/status';

  const configServiceMock = {
    get: jest.fn<string | undefined, [string]>(),
  };

  const validatorMock = {
    validate: jest.fn<
      boolean,
      [string, string, string, TwilioFormParameters]
    >(),
  };

  const trackingServiceMock = {
    recordProviderEvent: jest.fn<
      Promise<RecordDeliveryEventResult>,
      [RecordDeliveryEventInput]
    >(),
  };

  let service: TwilioWebhookService;

  const getRecordedEvent = (): RecordDeliveryEventInput => {
    const recordedEvent =
      trackingServiceMock.recordProviderEvent.mock.calls[0]?.[0];

    if (!recordedEvent) {
      throw new Error('Expected recordProviderEvent to be called');
    }

    return recordedEvent;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    configServiceMock.get.mockReturnValue(authToken);
    validatorMock.validate.mockReturnValue(true);

    trackingServiceMock.recordProviderEvent.mockResolvedValue({
      duplicate: false,
      stateChanged: true,
    });

    service = new TwilioWebhookService(
      configServiceMock as unknown as ConfigService,
      validatorMock as unknown as TwilioRequestValidatorService,
      trackingServiceMock as unknown as NotificationDeliveryTrackingService,
    );
  });

  it('should reject the webhook when TWILIO_AUTH_TOKEN is not configured', async () => {
    configServiceMock.get.mockReturnValue(undefined);

    await expect(
      service.handle(signature, requestUrl, {
        MessageSid: 'SM123',
        MessageStatus: 'delivered',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(validatorMock.validate).not.toHaveBeenCalled();

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject the webhook when the Twilio signature is missing', async () => {
    await expect(
      service.handle(undefined, requestUrl, {
        MessageSid: 'SM123',
        MessageStatus: 'delivered',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(validatorMock.validate).not.toHaveBeenCalled();

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject the webhook when signature validation fails', async () => {
    validatorMock.validate.mockReturnValue(false);

    const body = {
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
    };

    await expect(
      service.handle(signature, requestUrl, body),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(validatorMock.validate).toHaveBeenCalledWith(
      authToken,
      signature,
      requestUrl,
      body,
    );

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should normalize a delivered Twilio status', async () => {
    const body = {
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
    };

    await service.handle(signature, requestUrl, body);

    expect(trackingServiceMock.recordProviderEvent).toHaveBeenCalledTimes(1);

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      provider: 'twilio',
      providerMessageId: 'SM123',
      providerEventId: 'twilio:SM123:delivered',
      eventType: DeliveryEventType.DELIVERED,
      payload: body,
      targetStatus: DeliveryStatus.DELIVERED,
      errorMessage: undefined,
    });

    expect(recordedEvent.occurredAt).toBeInstanceOf(Date);
  });

  it('should normalize sent status as SENT', async () => {
    const body = {
      MessageSid: 'SM456',
      MessageStatus: 'sent',
    };

    await service.handle(signature, requestUrl, body);

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      provider: 'twilio',
      providerMessageId: 'SM456',
      providerEventId: 'twilio:SM456:sent',
      eventType: DeliveryEventType.SENT,
      targetStatus: DeliveryStatus.SENT,
      errorMessage: undefined,
    });
  });

  it('should normalize queued status as QUEUED while keeping delivery as SENT', async () => {
    await service.handle(signature, requestUrl, {
      MessageSid: 'SMQUEUED',
      MessageStatus: 'queued',
    });

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      providerMessageId: 'SMQUEUED',
      providerEventId: 'twilio:SMQUEUED:queued',
      eventType: DeliveryEventType.QUEUED,
      targetStatus: DeliveryStatus.SENT,
    });
  });

  it('should normalize accepted status as QUEUED while keeping delivery as SENT', async () => {
    await service.handle(signature, requestUrl, {
      MessageSid: 'SMACCEPTED',
      MessageStatus: 'accepted',
    });

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      providerMessageId: 'SMACCEPTED',
      providerEventId: 'twilio:SMACCEPTED:accepted',
      eventType: DeliveryEventType.QUEUED,
      targetStatus: DeliveryStatus.SENT,
    });
  });

  it('should normalize sending status', async () => {
    await service.handle(signature, requestUrl, {
      MessageSid: 'SMSENDING',
      MessageStatus: 'sending',
    });

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      providerMessageId: 'SMSENDING',
      providerEventId: 'twilio:SMSENDING:sending',
      eventType: DeliveryEventType.SENDING,
      targetStatus: DeliveryStatus.SENT,
    });
  });

  it('should normalize failed status and preserve the Twilio error message', async () => {
    await service.handle(signature, requestUrl, {
      MessageSid: 'SMFAILED',
      MessageStatus: 'failed',
      ErrorCode: '30003',
      ErrorMessage: 'Unreachable destination handset',
    });

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      providerMessageId: 'SMFAILED',
      providerEventId: 'twilio:SMFAILED:failed',
      eventType: DeliveryEventType.FAILED,
      targetStatus: DeliveryStatus.FAILED,
      errorMessage: 'Unreachable destination handset',
    });
  });

  it('should normalize undelivered status as FAILED', async () => {
    await service.handle(signature, requestUrl, {
      MessageSid: 'SMUNDELIVERED',
      MessageStatus: 'undelivered',
      ErrorMessage: 'Message was not delivered',
    });

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      providerMessageId: 'SMUNDELIVERED',
      providerEventId: 'twilio:SMUNDELIVERED:undelivered',
      eventType: DeliveryEventType.FAILED,
      targetStatus: DeliveryStatus.FAILED,
      errorMessage: 'Message was not delivered',
    });
  });

  it('should create an error message from ErrorCode when ErrorMessage is missing', async () => {
    await service.handle(signature, requestUrl, {
      MessageSid: 'SMFAILED',
      MessageStatus: 'undelivered',
      ErrorCode: '30005',
    });

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      eventType: DeliveryEventType.FAILED,
      targetStatus: DeliveryStatus.FAILED,
      errorMessage: 'Twilio reported delivery failure (30005)',
    });
  });

  it('should use a generic error when Twilio provides no failure details', async () => {
    await service.handle(signature, requestUrl, {
      MessageSid: 'SMFAILED',
      MessageStatus: 'failed',
    });

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      eventType: DeliveryEventType.FAILED,
      targetStatus: DeliveryStatus.FAILED,
      errorMessage: 'Twilio reported delivery failure',
    });
  });

  it('should normalize canceled status', async () => {
    await service.handle(signature, requestUrl, {
      MessageSid: 'SMCANCELED',
      MessageStatus: 'canceled',
    });

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      providerMessageId: 'SMCANCELED',
      providerEventId: 'twilio:SMCANCELED:canceled',
      eventType: DeliveryEventType.CANCELED,
      targetStatus: DeliveryStatus.FAILED,
      errorMessage: 'Twilio reported delivery failure',
    });
  });

  it('should preserve an unknown provider status as UNKNOWN', async () => {
    await service.handle(signature, requestUrl, {
      MessageSid: 'SMUNKNOWN',
      MessageStatus: 'custom-status',
    });

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      provider: 'twilio',
      providerMessageId: 'SMUNKNOWN',
      providerEventId: 'twilio:SMUNKNOWN:custom-status',
      eventType: DeliveryEventType.UNKNOWN,
    });

    expect(recordedEvent.targetStatus).toBeUndefined();
    expect(recordedEvent.errorMessage).toBeUndefined();
  });

  it('should convert MessageStatus to lowercase', async () => {
    await service.handle(signature, requestUrl, {
      MessageSid: 'SMUPPERCASE',
      MessageStatus: 'DELIVERED',
    });

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      providerMessageId: 'SMUPPERCASE',
      providerEventId: 'twilio:SMUPPERCASE:delivered',
      eventType: DeliveryEventType.DELIVERED,
      targetStatus: DeliveryStatus.DELIVERED,
    });
  });

  it('should reject a null webhook body', async () => {
    await expect(
      service.handle(signature, requestUrl, null),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject an array as webhook body', async () => {
    await expect(
      service.handle(signature, requestUrl, []),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject a primitive webhook body', async () => {
    await expect(
      service.handle(signature, requestUrl, 'invalid-body'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject a body containing unsupported parameter values', async () => {
    await expect(
      service.handle(signature, requestUrl, {
        MessageSid: 'SM123',
        MessageStatus: 123,
      }),
    ).rejects.toThrow('Invalid Twilio webhook parameter: MessageStatus');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject an array containing non-string parameter values', async () => {
    await expect(
      service.handle(signature, requestUrl, {
        MessageSid: 'SM123',
        MessageStatus: ['delivered', 123],
      }),
    ).rejects.toThrow('Invalid Twilio webhook parameter: MessageStatus');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject a webhook when MessageSid is missing', async () => {
    await expect(
      service.handle(signature, requestUrl, {
        MessageStatus: 'delivered',
      }),
    ).rejects.toThrow('Twilio webhook is missing MessageSid');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject a webhook when MessageStatus is missing', async () => {
    await expect(
      service.handle(signature, requestUrl, {
        MessageSid: 'SM123',
      }),
    ).rejects.toThrow('Twilio webhook is missing MessageStatus');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject an empty MessageSid', async () => {
    await expect(
      service.handle(signature, requestUrl, {
        MessageSid: '',
        MessageStatus: 'delivered',
      }),
    ).rejects.toThrow('Twilio webhook is missing MessageSid');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject an empty MessageStatus', async () => {
    await expect(
      service.handle(signature, requestUrl, {
        MessageSid: 'SM123',
        MessageStatus: '',
      }),
    ).rejects.toThrow('Twilio webhook is missing MessageStatus');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should accept single-value arrays from form parameters', async () => {
    const body = {
      MessageSid: ['SMARRAY'],
      MessageStatus: ['delivered'],
    };

    await service.handle(signature, requestUrl, body);

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent).toMatchObject({
      providerMessageId: 'SMARRAY',
      providerEventId: 'twilio:SMARRAY:delivered',
      eventType: DeliveryEventType.DELIVERED,
      targetStatus: DeliveryStatus.DELIVERED,
    });
  });

  it('should reject multiple MessageSid values', async () => {
    await expect(
      service.handle(signature, requestUrl, {
        MessageSid: ['SM123', 'SM456'],
        MessageStatus: 'delivered',
      }),
    ).rejects.toThrow('Twilio webhook is missing MessageSid');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should reject multiple MessageStatus values', async () => {
    await expect(
      service.handle(signature, requestUrl, {
        MessageSid: 'SM123',
        MessageStatus: ['sent', 'delivered'],
      }),
    ).rejects.toThrow('Twilio webhook is missing MessageStatus');

    expect(trackingServiceMock.recordProviderEvent).not.toHaveBeenCalled();
  });

  it('should pass all form parameters to the Twilio validator', async () => {
    const body = {
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
      To: '+525551234567',
      From: '+15005550006',
    };

    await service.handle(signature, requestUrl, body);

    expect(validatorMock.validate).toHaveBeenCalledWith(
      authToken,
      signature,
      requestUrl,
      body,
    );
  });

  it('should preserve the original body as the provider payload', async () => {
    const body = {
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
      To: '+525551234567',
      From: '+15005550006',
    };

    await service.handle(signature, requestUrl, body);

    const recordedEvent = getRecordedEvent();

    expect(recordedEvent.payload).toEqual(body);
  });
});
