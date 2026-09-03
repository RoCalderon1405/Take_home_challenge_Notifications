import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Configures the OpenAPI document and Swagger UI for the application.
 *
 * The Swagger UI exposes the public HTTP contract of the API and supports
 * JWT Bearer authentication for protected endpoints.
 *
 * @param app NestJS application instance.
 */
export function setupSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Notifications API')
    .setDescription(
      'REST API for authenticated notification management and delivery through Email, SMS and Push channels.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Enter the JWT access token returned by the login endpoint.',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
    customSiteTitle: 'Notifications API Docs',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
