import { UserStatus } from '../models';

export interface UserResponseDto {
  id: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt?: Date;
}
