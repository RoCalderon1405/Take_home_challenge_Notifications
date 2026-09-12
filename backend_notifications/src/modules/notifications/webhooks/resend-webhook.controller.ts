import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

import { ResendWebhookService } from './resend-webhook.service';

/** Receives signed delivery events directly from Resend. */
@Controller('webhooks/resend')
export class ResendWebhookController {
  constructor(private readonly webhookService: ResendWebhookService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers('svix-id') id?: string,
    @Headers('svix-timestamp') timestamp?: string,
    @Headers('svix-signature') signature?: string,
  ): Promise<void> {
    if (!request.rawBody) {
      throw new BadRequestException('Raw webhook body is unavailable');
    }

    await this.webhookService.handle(request.rawBody, {
      id,
      timestamp,
      signature,
    });
  }
}
