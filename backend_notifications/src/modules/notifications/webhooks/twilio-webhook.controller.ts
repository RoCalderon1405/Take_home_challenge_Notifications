import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import type { Request } from 'express';

import { TwilioWebhookService } from './twilio-webhook.service';

/** Receives signed delivery-status callbacks directly from Twilio. */
@Controller('webhooks/twilio')
export class TwilioWebhookController {
  constructor(
    private readonly configService: ConfigService,
    private readonly webhookService: TwilioWebhookService,
  ) {}

  @Post('status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiExcludeEndpoint()
  async handleStatus(
    @Req() request: Request,
    @Headers('x-twilio-signature') signature?: string,
  ): Promise<void> {
    const requestUrl = this.resolveSignatureUrl(request);

    await this.webhookService.handle(signature, requestUrl, request.body);
  }

  private resolveSignatureUrl(request: Request): string {
    const publicBaseUrl = this.configService.get<string>('PUBLIC_API_BASE_URL');

    if (publicBaseUrl) {
      const queryIndex = request.originalUrl.indexOf('?');
      const query =
        queryIndex >= 0 ? request.originalUrl.slice(queryIndex) : '';

      return `${publicBaseUrl.replace(/\/$/, '')}/api/webhooks/twilio/status${query}`;
    }

    return `${request.protocol}://${request.get('host') ?? ''}${request.originalUrl}`;
  }
}
