/**
 * Roles supported by the application's authorization system.
 *
 * Roles describe what an authenticated user is allowed to do.
 */
export const UserRole = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
