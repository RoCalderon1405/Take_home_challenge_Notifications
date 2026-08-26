import { UserStatus } from "./users-status.enum";

export interface UserModel {
  id: string;
  email: string;
  passwordHash?: string;
  status: UserStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserAuthModel extends UserModel {
  passwordHash: string;
}