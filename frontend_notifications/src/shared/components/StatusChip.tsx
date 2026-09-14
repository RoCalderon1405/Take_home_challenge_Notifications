import { Chip, type ChipProps } from '@mui/material';
import { useTranslation } from 'react-i18next';

const colorByStatus: Record<string, ChipProps['color']> = {
  PENDING: 'default',
  PROCESSING: 'warning',
  SENT: 'info',
  DELIVERED: 'success',
  FAILED: 'error',
};

export function StatusChip({ status }: { status: string }) {
  const { t } = useTranslation();

  return (
    <Chip
      size="small"
      variant="outlined"
      color={colorByStatus[status] ?? 'default'}
      label={t(`statuses.${status}`, { defaultValue: status })}
    />
  );
}
