import { Injectable } from '@nestjs/common';

import { createHmac, timingSafeEqual } from 'node:crypto';

export type TwilioFormValue = string | string[];
export type TwilioFormParameters = Record<string, TwilioFormValue>;

/**
 * Validates Twilio's X-Twilio-Signature for form-encoded callbacks.
 *
 * The implementation follows Twilio's documented HMAC-SHA1 algorithm. All
 * received form parameters participate in the signature because Twilio may
 * add callback fields over time without notice.
 */
@Injectable()
export class TwilioRequestValidatorService {
  validate(
    authToken: string,
    signature: string,
    url: string,
    params: TwilioFormParameters,
  ): boolean {
    const data = this.buildSignedData(url, params);

    const expected = createHmac('sha1', authToken)
      .update(data, 'utf8')
      .digest('base64');

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const receivedBuffer = Buffer.from(signature, 'utf8');

    return (
      expectedBuffer.length === receivedBuffer.length &&
      timingSafeEqual(expectedBuffer, receivedBuffer)
    );
  }

  private buildSignedData(url: string, params: TwilioFormParameters): string {
    let data = url;

    for (const name of Object.keys(params).sort()) {
      const rawValue = params[name];
      const values = Array.isArray(rawValue)
        ? [...new Set(rawValue)].sort()
        : [rawValue];

      for (const value of values) {
        data += `${name}${value}`;
      }
    }

    return data;
  }
}
