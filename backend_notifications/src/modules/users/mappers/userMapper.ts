import { UserModel } from '../models';
import { UserResponseDto } from '../response';

export class UserMapper {
  static toModel(user: UserModel): UserModel {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toResponse(user: UserModel): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
