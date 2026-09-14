import { memo } from 'react';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import type { NotificationModel } from '../models/notification.model';

interface NotificationSummaryProps {
  items: NotificationModel[];
  total: number;
}

export const NotificationSummary = memo(function NotificationSummary({ items, total }: NotificationSummaryProps) {
  const { t } = useTranslation();
  const delivered = items.filter((item) => item.status === 'DELIVERED').length;
  const failed = items.filter((item) => item.status === 'FAILED').length;
  const inProgress = items.filter((item) => ['PENDING', 'PROCESSING', 'SENT'].includes(item.status)).length;

  const cards = [
    { label: t('notifications.total'), value: total, icon: NotificationsActiveRoundedIcon, color: '#6f79ff' },
    { label: t('notifications.visibleInProgress'), value: inProgress, icon: ScheduleRoundedIcon, color: '#f1ae33' },
    { label: t('notifications.visibleDelivered'), value: delivered, icon: CheckCircleRoundedIcon, color: '#35d07f' },
    { label: t('notifications.visibleFailed'), value: failed, icon: ErrorRoundedIcon, color: '#ff5f73' },
  ];

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))', lg: 'repeat(4, minmax(0,1fr))' },
        gap: 2,
      }}
    >
      {cards.map(({ label, value, icon: Icon, color }) => (
        <Card key={label}>
          <CardContent sx={{ p: 2.2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  color,
                  bgcolor: `${color}1f`,
                }}
              >
                <Icon fontSize="small" />
              </Box>
              <Box>
                <Typography color="text.secondary" variant="body2">{label}</Typography>
                <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, mt: 0.15 }}>{value}</Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
});
