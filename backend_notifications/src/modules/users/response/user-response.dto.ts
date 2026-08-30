import { UserRole, UserStatus } from '../models';

export interface UserResponseDto {
  id: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  createdAt: Date;
  updatedAt?: Date;
}
