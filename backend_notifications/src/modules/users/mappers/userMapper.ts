import { UserAuthModel, UserModel } from '../models';
import { UserResponseDto } from '../response';

export class UserMapper {
  static toModel(user: UserAuthModel): UserModel {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static toResponse(user: UserModel): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
