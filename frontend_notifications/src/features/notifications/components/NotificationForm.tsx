import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import DevicesIcon from '@mui/icons-material/Devices';
import {
  Alert,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { registerForPushNotifications } from '../../../lib/firebase';
import { AppButton } from '../../../shared/components/AppButton';
import {
  NotificationChannel,
  type NotificationChannel as NotificationChannelType,
} from '../models/notification.model';

export interface NotificationFormValues {
  channel: NotificationChannelType;
  title: string;
  content: string;
  recipient: string;
}

interface NotificationFormProps {
  initialValues?: NotificationFormValues;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (values: NotificationFormValues) => Promise<void>;
}

export function NotificationForm({
  initialValues,
  submitLabel,
  loading = false,
  onSubmit,
}: NotificationFormProps) {
  const { t } = useTranslation();
  const [pushError, setPushError] = useState<string | null>(null);
  const [registeringPush, setRegisteringPush] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        channel: z.enum(['EMAIL', 'SMS', 'PUSH']),
        title: z.string().min(1, t('notifications.titleRequired')).max(200, t('notifications.titleMax')),
        content: z.string().min(1, t('notifications.contentRequired')),
        recipient: z.string().min(1, t('notifications.recipientRequired')).max(500, t('notifications.recipientMax')),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<NotificationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? {
      channel: NotificationChannel.EMAIL,
      title: '',
      content: '',
      recipient: '',
    },
  });

  const channel = useWatch({ control, name: 'channel' });

  const recipientHelper =
    channel === 'PUSH'
      ? t('notifications.pushHelper')
      : channel === 'SMS'
        ? t('notifications.smsHelper')
        : t('notifications.emailHelper');

  const registerCurrentBrowser = async () => {
    setPushError(null);
    setRegisteringPush(true);

    try {
      const fid = await registerForPushNotifications();
      setValue('recipient', fid, { shouldDirty: true, shouldValidate: true });
    } catch (error: unknown) {
      setPushError(error instanceof Error ? error.message : String(error));
    } finally {
      setRegisteringPush(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 820 }}>
      <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Stack component="form" spacing={3} onSubmit={handleSubmit(onSubmit)} noValidate>
          {pushError && <Alert severity="error">{pushError}</Alert>}

          <TextField
            select
            label={t('notifications.channel')}
            fullWidth
            {...register('channel')}
          >
            {Object.values(NotificationChannel).map((item) => (
              <MenuItem key={item} value={item}>{t(`channels.${item}`)}</MenuItem>
            ))}
          </TextField>

          <TextField
            label={t('notifications.titleField')}
            fullWidth
            error={Boolean(errors.title)}
            helperText={errors.title?.message}
            {...register('title')}
          />

          <TextField
            label={t('notifications.content')}
            fullWidth
            multiline
            minRows={5}
            error={Boolean(errors.content)}
            helperText={errors.content?.message}
            {...register('content')}
          />

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: { sm: 'flex-start' } }}
          >
            <TextField
              label={t('notifications.recipient')}
              fullWidth
              error={Boolean(errors.recipient)}
              helperText={errors.recipient?.message ?? recipientHelper}
              {...register('recipient')}
            />
            {channel === 'PUSH' && (
              <AppButton
                type="button"
                variant="outlined"
                startIcon={<DevicesIcon />}
                loading={registeringPush}
                onClick={() => void registerCurrentBrowser()}
                sx={{ minWidth: 190, mt: { sm: 1 } }}
              >
                {t('notifications.pushBrowser')}
              </AppButton>
            )}
          </Stack>

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <AppButton type="submit" variant="contained" loading={loading}>
              {submitLabel}
            </AppButton>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
