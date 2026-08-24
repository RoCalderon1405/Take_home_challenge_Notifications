import { UserStatus } from "../request";

export interface UserResponseDto {
  id: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
