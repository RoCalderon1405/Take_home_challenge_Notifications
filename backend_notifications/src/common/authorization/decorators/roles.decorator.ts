import { SetMetadata } from '@nestjs/common';

import { UserRole } from '../../../modules/users/models';

/**
 * Metadata key used to store the roles required by a route.
 */
export const ROLES_KEY = 'roles';

/**
 * Declares which user roles are allowed to access a route or controller.
 *
 * The decorator only stores authorization metadata. The actual validation
 * is performed later by RolesGuard.
 *
 * @param roles Roles allowed to access the protected resource.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
