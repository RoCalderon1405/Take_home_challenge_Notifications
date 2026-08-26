export const UserStatus = {
  ACTIVE: 'ACTIVE',
  BANNED: 'BANNED',
  INACTIVE: 'INACTIVE',
} as const;

export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
