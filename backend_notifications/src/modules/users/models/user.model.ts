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
 * This model extends the safe application model with the password hash
 * required to verify a submitted password.
 */
export interface UserAuthModel extends UserModel {
  passwordHash: string;
}
