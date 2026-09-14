import { useMemo, useState } from 'react';
import SendIcon from '@mui/icons-material/Send';
import {
  Alert,
  Card,
  CardContent,
  Divider,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { PageLayout } from '../../../layouts/PageLayout/PageLayout';
import { AppButton } from '../../../shared/components/AppButton';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { StatusChip } from '../../../shared/components/StatusChip';
import {
  useNotification,
  useNotificationDeliveries,
  useSendNotification,
} from '../hooks/notification.queries';

export function NotificationDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { id = '' } = useParams();
  const query = useNotification(id);
  const deliveriesQuery = useNotificationDeliveries(id);
  const sendMutation = useSendNotification(id);
  const [feedback, setFeedback] = useState<string | null>(
    (location.state as { feedback?: string } | null)?.feedback ?? null,
  );

  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }),
    [i18n.language],
  );

  if (query.isPending) return <LoadingState />;
  if (query.isError || !query.data) {
    return <ErrorState message={t('errors.loadNotification')} onRetry={() => void query.refetch()} />;
  }

  const notification = query.data;

  const sendAgain = async () => {
    await sendMutation.mutateAsync();
    setFeedback(t('notifications.queuedSuccess'));
  };

  return (
    <PageLayout
      title={notification.title}
      description={t('notifications.detail')}
      backTo="/notifications"
      actions={
        <Stack direction="row" spacing={1}>
          <AppButton variant="outlined" onClick={() => navigate(`/notifications/${id}/edit`)}>
            {t('common.edit')}
          </AppButton>
          <AppButton
            variant="contained"
            startIcon={<SendIcon />}
            loading={sendMutation.isPending}
            onClick={() => void sendAgain()}
          >
            {t('notifications.sendAgain')}
          </AppButton>
        </Stack>
      }
    >
      <Card>
        <CardContent>
          <Stack spacing={2.5}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{ justifyContent: 'space-between', gap: 2 }}
            >
              <Stack spacing={0.5}>
                <Typography color="text.secondary" variant="body2">{t('notifications.status')}</Typography>
                <StatusChip status={notification.status} />
              </Stack>
              <Stack spacing={0.5}>
                <Typography color="text.secondary" variant="body2">{t('notifications.channel')}</Typography>
                <Typography>{t(`channels.${notification.channel}`)}</Typography>
              </Stack>
              <Stack spacing={0.5}>
                <Typography color="text.secondary" variant="body2">{t('notifications.createdAt')}</Typography>
                <Typography>{dateFormatter.format(notification.createdAt)}</Typography>
              </Stack>
            </Stack>
            <Divider />
            <Stack spacing={0.75}>
              <Typography color="text.secondary" variant="body2">{t('notifications.recipient')}</Typography>
              <Typography sx={{ overflowWrap: 'anywhere' }}>{notification.recipient}</Typography>
            </Stack>
            <Stack spacing={0.75}>
              <Typography color="text.secondary" variant="body2">{t('notifications.content')}</Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{notification.content}</Typography>
            </Stack>
            {notification.lastError && <Alert severity="error">{notification.lastError}</Alert>}
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        <Typography variant="h5">{t('notifications.deliveries')}</Typography>
        {deliveriesQuery.isError ? (
          <ErrorState message={t('errors.generic')} onRetry={() => void deliveriesQuery.refetch()} />
        ) : deliveriesQuery.data?.length ? (
          deliveriesQuery.data.map((delivery) => (
            <Card key={delivery.id}>
              <CardContent>
                <Stack spacing={1.5}>
                  <Stack
                    direction="row"
                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography variant="h6">{t('notifications.attempt', { number: delivery.attemptNumber })}</Typography>
                    <StatusChip status={delivery.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {t('notifications.provider')}: {delivery.provider ?? '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                    {t('notifications.providerId')}: {delivery.providerMessageId ?? '—'}
                  </Typography>
                  {delivery.events.length > 0 && (
                    <Stack spacing={0.75}>
                      <Typography variant="subtitle2">{t('notifications.events')}</Typography>
                      {delivery.events.map((event) => (
                        <Typography key={event.id} variant="body2">
                          {event.eventType} · {dateFormatter.format(event.occurredAt)}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))
        ) : (
          <Typography color="text.secondary">{t('notifications.noDeliveries')}</Typography>
        )}
      </Stack>

      <Snackbar open={Boolean(feedback)} autoHideDuration={3500} onClose={() => setFeedback(null)}>
        <Alert severity="success" variant="filled" onClose={() => setFeedback(null)}>{feedback}</Alert>
      </Snackbar>
    </PageLayout>
  );
}
