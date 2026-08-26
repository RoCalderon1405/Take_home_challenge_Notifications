import { UserModel } from '../models';
import { UserStatus as PrismaUserStatus } from '@app/generated/prisma/client';
import { UserResponseDto } from '../response';

type PrismaUserData = {
  id: string;
  email: string;
  status: PrismaUserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export class UserMapper {
  static toResponse(user: UserModel): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt!,
      updatedAt: user.updatedAt,
    };
  }


}
