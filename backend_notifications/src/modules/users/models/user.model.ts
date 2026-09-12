import { UserRole } from './users-role.enum';
import { UserStatus } from './users-status.enum';

/**
 * Represents a safe user inside the application.
 *
 * Authentication secrets such as password hashes are intentionally
 * excluded from this model.
 */
export interface UserModel {
  id: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents a user during credential-based authentication.
 *
 * OAuth-only accounts have no local password, therefore passwordHash is
 * nullable and local authentication must reject those accounts cleanly.
 */
export interface UserAuthModel extends UserModel {
  passwordHash: string | null;
}
