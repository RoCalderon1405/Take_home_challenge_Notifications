import { useEffect } from 'react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch } from '../../../app/store';
import { setAuthenticatedUser } from '../../../app/store/auth.slice';
import { LoadingState } from '../../../shared/components/LoadingState';
import { authApi } from '../api/auth.api';
import { userMapper } from '../mappers/user.mapper';

export function GoogleCallbackPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    void authApi
      .me()
      .then((dto) => {
        if (!active) return;
        dispatch(setAuthenticatedUser(userMapper.toModel(dto)));
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        if (active) navigate('/login', { replace: true });
      });

    return () => {
      active = false;
    };
  }, [dispatch, navigate]);

  return (
    <Stack spacing={2}>
      <Alert severity="info">{t('auth.completingGoogle')}</Alert>
      <LoadingState />
    </Stack>
  );
}
