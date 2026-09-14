import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import { Alert, Button, Stack } from '@mui/material';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();

  return (
    <Alert
      severity="error"
      icon={<ErrorOutlinedIcon />}
      action={
        onRetry ? (
          <Button color="inherit" size="small" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        ) : undefined
      }
    >
      <Stack>{message}</Stack>
    </Alert>
  );
}
