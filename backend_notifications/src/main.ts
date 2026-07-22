import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, VersioningType } from '@nestjs/common';
import { Envs } from './config/config';

async function bootstrap() {
  const logger = new Logger('Notifications - App');

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // app.enableVersioning({
  //   type: VersioningType.URI,
  //   defaultVersion: '1',
  // });

  app.enableCors({
    origin: Envs.ALLOWED_ORIGINS,
    credentials: true,
    // methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(Number(process.env.PORT ?? 3002), '0.0.0.0');
  logger.log(`🚀 Application is running on: http://localhost:${process.env.PORT}/api`);
}
bootstrap();
