import type { ReactNode } from 'react';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface PageLayoutProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  backTo?: string;
  children: ReactNode;
}

export function PageLayout({
  title,
  description,
  actions,
  backTo,
  children,
}: PageLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'flex-start' },
        }}
      >
        <Box>
          {backTo && (
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(backTo)}
              sx={{ mb: 1, ml: -1 }}
            >
              {t('common.back')}
            </Button>
          )}
          <Typography variant="h4" component="h1">{title}</Typography>
          {description && (
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions}
      </Stack>
      {children}
    </Stack>
  );
}
