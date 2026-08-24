import { IsDate, IsEnum, IsString, IsUUID } from 'class-validator';
import { UserStatus } from '../request';

export class UserEntity {
  @IsUUID()
  @IsString()
  id!: string;

  email!: string;

  @IsString()
  passwordHash?: string;

  @IsEnum({ UserStatus }, { message: 'Invalid user status' })
  status?: UserStatus;

  @IsDate()
  createdAt?: Date;

  @IsDate()
  updatedAt?: Date;

  // notifications: Notification[];
}
