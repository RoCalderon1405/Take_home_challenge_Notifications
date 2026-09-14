import type { UserDto } from '../api/auth.dto';
import type { UserModel } from '../models/user.model';

export const userMapper = {
  toModel(dto: UserDto): UserModel {
    return {
      ...dto,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
    };
  },
};
