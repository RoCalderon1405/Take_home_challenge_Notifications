import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { configureApp } from './config/app.config';

/**
 * Bootstraps and configures the Notifications API.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Notifications - App');

  const app = await NestFactory.create(AppModule, { rawBody: true });

  const configService = app.get(ConfigService);

  const port = Number(configService.getOrThrow<string>('PORT'));

  configureApp(app, configService);

  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);

  logger.log(`📚 Swagger is running on: http://localhost:${port}/api/docs`);
}

void bootstrap();
