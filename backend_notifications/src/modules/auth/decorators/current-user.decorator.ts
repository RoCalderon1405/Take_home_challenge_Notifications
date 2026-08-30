import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { UserModel } from '../../users/models';

/**
 * Retrieves the authenticated user attached to the HTTP request by Passport.
 *
 * This decorator keeps controllers independent from the underlying Express
 * request object and centralizes access to request.user.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserModel => {
    const request = context.switchToHttp().getRequest<{
      user: UserModel;
    }>();

    return request.user;
  },
);
