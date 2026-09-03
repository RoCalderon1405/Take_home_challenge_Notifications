import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CreateUserDto } from '../request';
import { UserResponseDto } from '../response';

const USER_ID_EXAMPLE = '213b0b1e-a3c7-45c1-8a3f-12d0acb218e6';

/**
 * Documents the Users controller.
 */
export function ApiUsersController() {
  return applyDecorators(ApiTags('Users'));
}

/**
 * Documents public user registration.
 */
export function ApiCreateUser() {
  return applyDecorators(
    ApiOperation({
      summary: 'Create a user',
      description:
        'Creates a new user account with the default application role and status.',
    }),

    ApiBody({
      type: CreateUserDto,
      description: 'User registration data.',
      examples: {
        user: {
          summary: 'New user',
          value: {
            email: 'user@example.com',
            password: 'StrongPassword123!',
          },
        },
      },
    }),

    ApiCreatedResponse({
      description: 'User created successfully.',
      type: UserResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'The request body is invalid.',
    }),

    ApiConflictResponse({
      description: 'A user with the provided email already exists.',
    }),
  );
}

/**
 * Documents retrieval of all registered users.
 */
export function ApiGetUsers() {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiOperation({
      summary: 'List users',
      description:
        'Returns all registered users. This operation is restricted to administrators.',
    }),

    ApiOkResponse({
      description: 'Users retrieved successfully.',
      type: UserResponseDto,
      isArray: true,
    }),

    ApiUnauthorizedResponse({
      description:
        'Authentication is required or the provided access token is invalid.',
    }),

    ApiForbiddenResponse({
      description: 'The authenticated user does not have the ADMIN role.',
    }),
  );
}

/**
 * Documents retrieval of a user by identifier.
 */
export function ApiGetUser() {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiOperation({
      summary: 'Get a user',
      description:
        'Returns a user by UUID. This operation is restricted to administrators.',
    }),

    ApiParam({
      name: 'id',
      description: 'User UUID.',
      type: String,
      format: 'uuid',
      example: USER_ID_EXAMPLE,
    }),

    ApiOkResponse({
      description: 'User retrieved successfully.',
      type: UserResponseDto,
    }),

    ApiBadRequestResponse({
      description: 'The user identifier is not a valid UUID.',
    }),

    ApiUnauthorizedResponse({
      description:
        'Authentication is required or the provided access token is invalid.',
    }),

    ApiForbiddenResponse({
      description: 'The authenticated user does not have the ADMIN role.',
    }),

    ApiNotFoundResponse({
      description: 'The requested user does not exist.',
    }),
  );
}

/**
 * Documents deletion of a user account.
 */
export function ApiDeleteUser() {
  return applyDecorators(
    ApiBearerAuth('access-token'),

    ApiOperation({
      summary: 'Delete a user',
      description:
        'Deletes a user account by UUID. This operation is restricted to administrators.',
    }),

    ApiParam({
      name: 'id',
      description: 'User UUID.',
      type: String,
      format: 'uuid',
      example: USER_ID_EXAMPLE,
    }),

    ApiNoContentResponse({
      description: 'User deleted successfully.',
    }),

    ApiBadRequestResponse({
      description: 'The user identifier is not a valid UUID.',
    }),

    ApiUnauthorizedResponse({
      description:
        'Authentication is required or the provided access token is invalid.',
    }),

    ApiForbiddenResponse({
      description: 'The authenticated user does not have the ADMIN role.',
    }),

    ApiNotFoundResponse({
      description: 'The requested user does not exist.',
    }),
  );
}
