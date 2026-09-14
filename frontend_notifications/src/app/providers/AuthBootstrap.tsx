import { useEffect } from 'react';

import { env } from '../../config/env';
import { AUTH_UNAUTHORIZED_EVENT } from '../../core/api';
import { tokenStorage } from '../../core/auth/token-storage';
import { authApi } from '../../features/auth/api/auth.api';
import { userMapper } from '../../features/auth/mappers/user.mapper';
import {
  clearAuthenticatedUser,
  markAuthInitialized,
  setAuthenticatedUser,
} from '../store/auth.slice';
import { useAppDispatch } from '../store';

export function AuthBootstrap() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleUnauthorized = () => {
      dispatch(clearAuthenticatedUser());
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);

    let active = true;

    const initialize = async () => {
      if (env.authTransport === 'bearer' && !tokenStorage.get()) {
        dispatch(markAuthInitialized());
        return;
      }

      try {
        const dto = await authApi.me();
        if (active) {
          dispatch(setAuthenticatedUser(userMapper.toModel(dto)));
        }
      } catch {
        if (active) {
          dispatch(clearAuthenticatedUser());
        }
      }
    };

    void initialize();

    return () => {
      active = false;
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, [dispatch]);

  return null;
}
