import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { setupSwagger } from './swagger.config';

/**
 * Applies the shared HTTP configuration used by the application.
 *
 * Keeping this configuration centralized prevents production and E2E
 * environments from bootstrapping the API differently.
 */
export function configureApp(
  app: INestApplication,
  configService: ConfigService,
): void {
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
}
