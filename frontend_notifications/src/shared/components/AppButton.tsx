import { CircularProgress, Button, type ButtonProps } from '@mui/material';

interface AppButtonProps extends ButtonProps {
  loading?: boolean;
}

export function AppButton({
  loading = false,
  disabled,
  children,
  startIcon,
  ...props
}: AppButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      startIcon={
        loading ? <CircularProgress size={18} color="inherit" /> : startIcon
      }
    >
      {children}
    </Button>
  );
}
