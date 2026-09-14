import { useState } from 'react';
import { Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { PageLayout } from '../../../layouts/PageLayout/PageLayout';
import { ApiError } from '../../../core/api';
import { NotificationForm, type NotificationFormValues } from '../components/NotificationForm';
import { useCreateNotification } from '../hooks/notification.queries';

export function CreateNotificationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mutation = useCreateNotification();
  const [error, setError] = useState<string | null>(null);

  const submit = async (values: NotificationFormValues) => {
    setError(null);
    try {
      const created = await mutation.mutateAsync(values);
      navigate(`/notifications/${created.id}`, {
        replace: true,
        state: { feedback: t('notifications.createdSuccess') },
      });
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    }
  };

  return (
    <PageLayout title={t('notifications.create')} backTo="/notifications">
      {error && <Alert severity="error">{error}</Alert>}
      <NotificationForm
        submitLabel={t('notifications.create')}
        loading={mutation.isPending}
        onSubmit={submit}
      />
    </PageLayout>
  );
}
