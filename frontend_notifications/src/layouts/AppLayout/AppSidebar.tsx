import AddAlertRoundedIcon from '@mui/icons-material/AddAlertRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

interface AppSidebarProps {
  onNavigate?: () => void;
}

const navItems = [
  { path: '/dashboard', icon: DashboardRoundedIcon, key: 'dashboard' },
  { path: '/notifications/new', icon: AddAlertRoundedIcon, key: 'create' },
  { path: '/notifications', icon: NotificationsOutlinedIcon, key: 'notifications' },
] as const;

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const go = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        color: '#dce4f4',
        background:
          'radial-gradient(circle at 20% 78%, rgba(67,82,255,0.22), transparent 28%), linear-gradient(180deg, #0b1424 0%, #0b1526 58%, #0a1220 100%)',
      }}
    >
      <Stack direction="row" spacing={1.35} sx={{ alignItems: 'center', px: 2.5, py: 2.6 }}>
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 2.5,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: 'linear-gradient(135deg, #6d63ff, #4f5bff)',
            boxShadow: '0 12px 32px rgba(95,89,255,0.34)',
          }}
        >
          <NotificationsActiveRoundedIcon />
        </Box>
        <Typography sx={{ fontSize: '1.18rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
          {t('common.appName')}
        </Typography>
      </Stack>

      <List sx={{ px: 1.5, pt: 1, pb: 2 }}>
        {navItems.map(({ path, icon: Icon, key }) => {
          const selected =
            key === 'notifications'
              ? location.pathname === '/notifications' || /^\/notifications\/[^/]+$/.test(location.pathname)
              : key === 'create'
                ? location.pathname === '/notifications/new'
                : location.pathname === path;

          return (
            <ListItemButton
              key={path}
              selected={selected}
              onClick={() => go(path)}
              sx={{
                borderRadius: 2.5,
                mb: 0.8,
                minHeight: 48,
                color: selected ? '#fff' : '#aebbd0',
                '& .MuiListItemIcon-root': { color: selected ? '#9da7ff' : '#8190aa' },
                '&.Mui-selected': {
                  background: 'linear-gradient(90deg, rgba(101,89,255,0.32), rgba(82,91,255,0.17))',
                  boxShadow: 'inset 3px 0 0 #7467ff',
                },
                '&.Mui-selected:hover': {
                  background: 'linear-gradient(90deg, rgba(101,89,255,0.38), rgba(82,91,255,0.22))',
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography
                    component="span"
                    sx={{
                      fontWeight: selected ? 700 : 560,
                      fontSize: '0.92rem',
                    }}
                  >
                    {t(`nav.${key}`)}
                  </Typography>
                }
              />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ flexGrow: 1 }} />

      <Box sx={{ px: 1.8, pb: 2.2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            border: '1px solid rgba(122,137,255,0.18)',
            bgcolor: 'rgba(255,255,255,0.035)',
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 750, fontSize: '0.9rem' }}>
            Email · SMS · Push
          </Typography>
          <Typography sx={{ color: '#8190aa', fontSize: '0.78rem', mt: 0.6, lineHeight: 1.5 }}>
            {t('dashboard.previewSubtitle')}
          </Typography>
          <Box
            sx={{
              mt: 1.6,
              height: 6,
              borderRadius: 99,
              bgcolor: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: '72%',
                height: '100%',
                borderRadius: 99,
                background: 'linear-gradient(90deg, #5b63ff, #9274ff)',
              }}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
