/**
 * External identity providers supported by the application.
 *
 * These values intentionally mirror the stable provider codes persisted in
 * the user identity table without exposing Prisma types to the application.
 */
export const UserAuthProvider = {
  GOOGLE: 'GOOGLE',
} as const;

export type UserAuthProvider =
  (typeof UserAuthProvider)[keyof typeof UserAuthProvider];
