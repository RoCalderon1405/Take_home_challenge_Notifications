import { UserRole, UserStatus } from '../models';

/**
 * Represents the public user information returned by the API.
 *
 * Authentication secrets such as password hashes are intentionally
 * excluded from this response model.
 */
export class UserResponseDto {
  id!: string;

  email!: string;

  status!: UserStatus;

  role!: UserRole;

  createdAt!: Date;

  updatedAt!: Date;
}
