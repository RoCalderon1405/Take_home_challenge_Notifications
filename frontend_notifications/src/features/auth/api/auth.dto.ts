export interface LoginRequestDto {
  email: string;
  password: string;
}

export interface UserDto {
  id: string;
  email: string;
  status: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponseDto {
  user: UserDto;
  accessToken?: string;
}
