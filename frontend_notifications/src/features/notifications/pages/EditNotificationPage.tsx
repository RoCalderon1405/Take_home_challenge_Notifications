import { useState } from 'react';
import { Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { ApiError } from '../../../core/api';
import { PageLayout } from '../../../layouts/PageLayout/PageLayout';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { NotificationForm, type NotificationFormValues } from '../components/NotificationForm';
import { useNotification, useUpdateNotification } from '../hooks/notification.queries';

export function EditNotificationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const query = useNotification(id);
  const mutation = useUpdateNotification(id);
  const [error, setError] = useState<string | null>(null);

  if (query.isPending) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState message={t('errors.loadNotification')} onRetry={() => void query.refetch()} />;
  }

  const submit = async (values: NotificationFormValues) => {
    setError(null);
    try {
      await mutation.mutateAsync(values);
      navigate(`/notifications/${id}`, {
        replace: true,
        state: { feedback: t('notifications.updatedSuccess') },
      });
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : t('errors.generic'));
    }
  };

  return (
    <PageLayout title={t('notifications.edit')} backTo={`/notifications/${id}`}>
      {error && <Alert severity="error">{error}</Alert>}
      <NotificationForm
        initialValues={{
          channel: query.data.channel,
          title: query.data.title,
          content: query.data.content,
          recipient: query.data.recipient,
        }}
        submitLabel={t('common.save')}
        loading={mutation.isPending}
        onSubmit={submit}
      />
    </PageLayout>
  );
}
