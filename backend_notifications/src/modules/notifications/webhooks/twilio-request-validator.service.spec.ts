import { createHmac } from 'node:crypto';

import { TwilioRequestValidatorService } from './twilio-request-validator.service';

describe('TwilioRequestValidatorService', () => {
  let service: TwilioRequestValidatorService;

  beforeEach(() => {
    service = new TwilioRequestValidatorService();
  });

  it('should validate a correct Twilio signature', () => {
    const authToken = 'test-auth-token';
    const url = 'https://api.example.com/api/webhooks/twilio/status';

    const params = {
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
    };

    const signedData = `${url}` + 'MessageSidSM123' + 'MessageStatusdelivered';

    const signature = createHmac('sha1', authToken)
      .update(signedData, 'utf8')
      .digest('base64');

    expect(service.validate(authToken, signature, url, params)).toBe(true);
  });

  it('should reject an invalid signature with the same length', () => {
    const authToken = 'test-auth-token';
    const url = 'https://api.example.com/api/webhooks/twilio/status';

    const params = {
      MessageSid: 'SM123',
      MessageStatus: 'delivered',
    };

    const validSignature = createHmac('sha1', authToken)
      .update(`${url}MessageSidSM123MessageStatusdelivered`, 'utf8')
      .digest('base64');

    const invalidSignature =
      validSignature.slice(0, -1) + (validSignature.endsWith('A') ? 'B' : 'A');

    expect(service.validate(authToken, invalidSignature, url, params)).toBe(
      false,
    );
  });

  it('should reject a signature with a different length', () => {
    expect(
      service.validate(
        'test-auth-token',
        'invalid',
        'https://api.example.com/api/webhooks/twilio/status',
        {
          MessageSid: 'SM123',
        },
      ),
    ).toBe(false);
  });

  it('should sort parameter names and array values before validating', () => {
    const authToken = 'test-auth-token';
    const url = 'https://api.example.com/webhook';

    const params = {
      Zebra: ['second', 'first', 'first'],
      Alpha: 'value',
    };

    const signedData = `${url}` + 'Alphavalue' + 'Zebrafirst' + 'Zebrasecond';

    const signature = createHmac('sha1', authToken)
      .update(signedData, 'utf8')
      .digest('base64');

    expect(service.validate(authToken, signature, url, params)).toBe(true);
  });
});
