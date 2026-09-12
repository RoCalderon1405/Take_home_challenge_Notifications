import { applyDecorators } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

import { UserResponseDto } from '@app/modules/users/response';
import { LoginDto } from '../request';

const authResponseSchema = {
  type: 'object',
  required: ['user', 'accessToken'],
  properties: {
    user: {
      $ref: getSchemaPath(UserResponseDto),
    },
    accessToken: {
      type: 'string',
      description: 'JWT access token used to authenticate protected requests.',
      example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    },
  },
};

/**
 * Documents the Auth controller and registers the response models
 * referenced by its OpenAPI schemas.
 */
export function ApiAuthController() {
  return applyDecorators(
    ApiTags('Authentication'),
    ApiExtraModels(UserResponseDto),
  );
}

/**
 * Documents credential-based authentication.
 */
export function ApiLogin() {
  return applyDecorators(
    ApiOperation({
      summary: 'Log in',
      description:
        'Authenticates a user using email and password and returns a JWT access token.',
    }),
    ApiBody({
      type: LoginDto,
      description: 'Credentials used to authenticate the user.',
      examples: {
        credentials: {
          summary: 'User credentials',
          value: {
            email: 'user@example.com',
            password: 'StrongPassword123!',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Authentication completed successfully.',
      schema: authResponseSchema,
    }),
    ApiUnauthorizedResponse({
      description: 'The email or password is incorrect.',
    }),
  );
}

/**
 * Documents the endpoint that starts Google OAuth.
 */
export function ApiGoogleLogin() {
  return applyDecorators(
    ApiOperation({
      summary: 'Start Google OAuth login',
      description:
        'Redirects the browser to Google. Google OAuth must be enabled in the environment configuration.',
    }),
    ApiFoundResponse({
      description: 'Redirects to Google for authentication.',
    }),
    ApiServiceUnavailableResponse({
      description: 'Google OAuth is disabled or not configured.',
    }),
  );
}

/**
 * Documents Google's OAuth callback handled by Passport.
 */
export function ApiGoogleCallback() {
  return applyDecorators(
    ApiOperation({
      summary: 'Google OAuth callback',
      description:
        'Google redirects here after authentication. The backend resolves or creates the application user and returns its JWT access token.',
    }),
    ApiOkResponse({
      description: 'Google authentication completed successfully.',
      schema: authResponseSchema,
    }),
    ApiUnauthorizedResponse({
      description: 'Google did not provide a usable authenticated identity.',
    }),
    ApiServiceUnavailableResponse({
      description: 'Google OAuth is disabled or not configured.',
    }),
  );
}

/**
 * Documents retrieval of the currently authenticated user.
 */
export function ApiGetCurrentUser() {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Get current user',
      description:
        'Returns the user associated with the provided JWT access token.',
    }),
    ApiOkResponse({
      description: 'Authenticated user retrieved successfully.',
      type: UserResponseDto,
    }),
    ApiUnauthorizedResponse({
      description:
        'Authentication is required or the provided access token is invalid.',
    }),
  );
}
