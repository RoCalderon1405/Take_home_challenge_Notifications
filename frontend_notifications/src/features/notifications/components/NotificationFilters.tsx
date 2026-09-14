import ClearAllIcon from '@mui/icons-material/ClearAll';
import {
  Button,
  Card,
  CardContent,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import {
  NotificationChannel,
  NotificationStatus,
  type NotificationChannel as NotificationChannelType,
  type NotificationStatus as NotificationStatusType,
} from '../models/notification.model';

interface NotificationFiltersProps {
  search: string;
  status: NotificationStatusType | '';
  channel: NotificationChannelType | '';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: NotificationStatusType | '') => void;
  onChannelChange: (value: NotificationChannelType | '') => void;
  onClear: () => void;
}

export function NotificationFilters({
  search,
  status,
  channel,
  onSearchChange,
  onStatusChange,
  onChannelChange,
  onClear,
}: NotificationFiltersProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
          sx={{ alignItems: { lg: 'center' } }}
        >
          <TextField
            label={t('common.search')}
            placeholder={t('notifications.searchPlaceholder')}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            fullWidth
            size="small"
            sx={{ minWidth: { lg: 320 } }}
          />
          <TextField
            select
            label={t('notifications.status')}
            value={status}
            onChange={(event) => onStatusChange(event.target.value as NotificationStatusType | '')}
            size="small"
            sx={{ minWidth: 190 }}
          >
            <MenuItem value="">{t('notifications.allStatuses')}</MenuItem>
            {Object.values(NotificationStatus).map((item) => (
              <MenuItem key={item} value={item}>{t(`statuses.${item}`)}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label={t('notifications.channel')}
            value={channel}
            onChange={(event) => onChannelChange(event.target.value as NotificationChannelType | '')}
            size="small"
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">{t('notifications.allChannels')}</MenuItem>
            {Object.values(NotificationChannel).map((item) => (
              <MenuItem key={item} value={item}>{t(`channels.${item}`)}</MenuItem>
            ))}
          </TextField>
          <Button startIcon={<ClearAllIcon />} onClick={onClear} sx={{ whiteSpace: 'nowrap' }}>
            {t('common.clear')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
