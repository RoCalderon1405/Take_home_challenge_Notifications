import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';

/**
 * Bootstraps and configures the Notifications API.
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger('Notifications - App');

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const port = Number(configService.getOrThrow<string>('PORT'));

  const allowedOrigins = configService.getOrThrow<string>('ALLOWED_ORIGINS');

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupSwagger(app);

  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Application is running on: http://localhost:${port}/api`);

  logger.log(`📚 Swagger is running on: http://localhost:${port}/api/docs`);
}

void bootstrap();
