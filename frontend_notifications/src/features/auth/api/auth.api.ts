import { apiClient } from '../../../core/api';
import type { LoginRequestDto, LoginResponseDto, UserDto } from './auth.dto';

export const authApi = {
  async login(payload: LoginRequestDto): Promise<LoginResponseDto> {
    const response = await apiClient.post<LoginResponseDto>('/auth/login', payload);
    return response.data;
  },

  async me(): Promise<UserDto> {
    const response = await apiClient.get<UserDto>('/auth/me');
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },
};
