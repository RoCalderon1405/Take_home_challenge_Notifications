import axios, { AxiosError } from 'axios';

import { env } from '../../config/env';
import { tokenStorage } from '../auth/token-storage';
import { ApiError } from './api-error';

export const AUTH_UNAUTHORIZED_EVENT = 'notifications:auth-unauthorized';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 10_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{
        message?: string | string[];
        error?: string;
      }>;

      const messageValue = axiosError.response?.data?.message;
      const message = Array.isArray(messageValue)
        ? messageValue.join(', ')
        : messageValue ?? axiosError.message ?? 'Unexpected API error';

      const normalized = new ApiError(
        message,
        axiosError.response?.status ?? null,
        axiosError.response?.data,
      );

      if (normalized.status === 401) {
        tokenStorage.clear();
        window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
      }

      return Promise.reject(normalized);
    }

    return Promise.reject(
      new ApiError(
        error instanceof Error ? error.message : 'Unexpected error',
        null,
        error,
      ),
    );
  },
);
