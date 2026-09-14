import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import QueryStatsRoundedIcon from '@mui/icons-material/QueryStatsRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../app/store';
import { setLanguage } from '../../app/store/preferences.slice';

const features = [
  { icon: SendRoundedIcon, key: 'reliableDelivery' },
  { icon: GroupsRoundedIcon, key: 'customerExperience' },
  { icon: QueryStatsRoundedIcon, key: 'insightsMatter' },
] as const;

export function AuthLayout() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { language } = useAppSelector((state) => state.preferences);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        colorScheme: 'light',
        background:
          'linear-gradient(120deg, #fbfdff 0%, #eef7ff 38%, #d9edff 68%, #c7e4ff 100%)',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: { xs: 520, md: 900 },
          height: { xs: 520, md: 900 },
          borderRadius: '50%',
          left: { xs: '-55%', md: '-14%' },
          bottom: { xs: '-35%', md: '-52%' },
          background:
            'radial-gradient(circle at 65% 35%, rgba(255,255,255,0.98) 0%, rgba(197,229,255,0.86) 36%, rgba(92,167,242,0.20) 66%, transparent 72%)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: { xs: 460, md: 760 },
          height: { xs: 680, md: 920 },
          right: { xs: '-65%', md: '-9%' },
          top: { xs: '8%', md: '-17%' },
          borderRadius: '110px',
          transform: 'rotate(18deg)',
          background:
            'linear-gradient(150deg, rgba(255,255,255,0.72), rgba(181,218,250,0.2) 48%, rgba(51,131,218,0.08))',
          border: '1px solid rgba(255,255,255,0.75)',
          boxShadow: 'inset 0 0 80px rgba(255,255,255,0.42)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          maxWidth: 1500,
          mx: 'auto',
          px: { xs: 2.5, sm: 4, lg: 8 },
          py: { xs: 2.5, sm: 4 },
          display: 'grid',
          gridTemplateRows: 'auto 1fr',
        }}
      >
        <Stack
          direction="row"
          sx={{ justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                background: 'linear-gradient(135deg, #2276f5, #3f9cff)',
                boxShadow: '0 12px 30px rgba(34,118,245,0.28)',
              }}
            >
              <NotificationsActiveRoundedIcon />
            </Box>
            <Typography
              sx={{
                color: '#0b1f44',
                fontSize: { xs: '1.35rem', sm: '1.7rem' },
                fontWeight: 800,
                letterSpacing: '-0.035em',
              }}
            >
              {t('common.appName')}
            </Typography>
          </Stack>

          <Tooltip title={t('common.language')}>
            <IconButton
              aria-label={t('common.language')}
              onClick={() => dispatch(setLanguage(language === 'es' ? 'en' : 'es'))}
              sx={{
                color: '#23416f',
                bgcolor: 'rgba(255,255,255,0.55)',
                border: '1px solid rgba(255,255,255,0.7)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <LanguageIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(420px, 0.72fr)' },
            gap: { xs: 5, lg: 10 },
            alignItems: 'center',
            py: { xs: 5, lg: 6 },
          }}
        >
          <Stack
            spacing={4}
            sx={{
              maxWidth: 680,
              display: { xs: 'none', md: 'flex' },
            }}
          >
            <Box>
              <Typography
                component="h2"
                sx={{
                  color: '#0a214d',
                  maxWidth: 620,
                  fontWeight: 850,
                  fontSize: { md: '3.8rem', xl: '4.7rem' },
                  lineHeight: 0.98,
                  letterSpacing: '-0.06em',
                }}
              >
                {t('auth.heroTitlePrefix')}{' '}
                <Box component="span" sx={{ color: '#2c78f6' }}>
                  {t('auth.heroTitleHighlight')}
                </Box>
              </Typography>
              <Typography
                sx={{
                  mt: 2.5,
                  maxWidth: 570,
                  color: '#60749a',
                  fontSize: '1.2rem',
                  lineHeight: 1.6,
                }}
              >
                {t('auth.heroSubtitle')}
              </Typography>
            </Box>

            <Stack spacing={2.2}>
              {features.map(({ icon: Icon, key }) => (
                <Stack key={key} direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#2675ef',
                      bgcolor: 'rgba(255,255,255,0.55)',
                      border: '1px solid rgba(255,255,255,0.75)',
                    }}
                  >
                    <Icon />
                  </Box>
                  <Box>
                    <Typography sx={{ color: '#102957', fontWeight: 750 }}>
                      {t(`auth.${key}`)}
                    </Typography>
                    <Typography sx={{ color: '#7485a3', fontSize: '0.94rem' }}>
                      {t(`auth.${key}Description`)}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>

            <Typography sx={{ color: '#7183a3', fontWeight: 550, pt: 2 }}>
              {t('auth.heroFooter')}
            </Typography>
          </Stack>

          <Box sx={{ width: '100%', display: 'grid', placeItems: 'center' }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
