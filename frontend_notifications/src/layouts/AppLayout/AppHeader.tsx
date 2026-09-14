import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LanguageIcon from '@mui/icons-material/Language';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../app/store';
import { clearAuthenticatedUser } from '../../app/store/auth.slice';
import { setLanguage, toggleColorMode } from '../../app/store/preferences.slice';
import { env } from '../../config/env';
import { tokenStorage } from '../../core/auth/token-storage';
import { authApi } from '../../features/auth/api/auth.api';

interface AppHeaderProps {
  drawerWidth: number;
  onMenuClick: () => void;
}

export function AppHeader({ drawerWidth, onMenuClick }: AppHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const { colorMode, language } = useAppSelector((state) => state.preferences);
  const [search, setSearch] = useState('');

  const logout = async () => {
    if (env.authTransport === 'cookie') {
      try {
        await authApi.logout();
      } catch {
        // Client state is cleared even when the server is temporarily unavailable.
      }
    }

    tokenStorage.clear();
    dispatch(clearAuthenticatedUser());
  };

  const submitSearch = () => {
    const value = search.trim();
    navigate(value ? `/notifications?search=${encodeURIComponent(value)}` : '/notifications');
  };

  return (
    <AppBar
      position="fixed"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        bgcolor: colorMode === 'dark' ? 'rgba(10,18,32,0.86)' : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(18px)',
      }}
    >
      <Toolbar sx={{ minHeight: { xs: 64, md: 76 } }}>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 1.5, display: { md: 'none' } }}
          aria-label="menu"
        >
          <MenuIcon />
        </IconButton>

        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitSearch();
          }}
          placeholder={t('notifications.searchPlaceholder')}
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            width: { xs: '100%', sm: 420, lg: 520 },
            maxWidth: '55vw',
            '& .MuiOutlinedInput-root': {
              borderRadius: 99,
              bgcolor: colorMode === 'dark' ? 'rgba(255,255,255,0.035)' : 'rgba(15,37,70,0.035)',
            },
          }}
        />

        <Box sx={{ flexGrow: 1 }} />
        <Stack direction="row" spacing={0.45} sx={{ alignItems: 'center' }}>
          <Tooltip title={t('common.language')}>
            <IconButton
              aria-label={t('common.language')}
              onClick={() => dispatch(setLanguage(language === 'es' ? 'en' : 'es'))}
            >
              <LanguageIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={t('common.theme')}>
            <IconButton aria-label={t('common.theme')} onClick={() => dispatch(toggleColorMode())}>
              {colorMode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={t('nav.notifications')}>
            <IconButton aria-label={t('nav.notifications')} onClick={() => navigate('/notifications')}>
              <Badge variant="dot" color="error">
                <NotificationsNoneRoundedIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>
          <Stack direction="row" spacing={1.1} sx={{ ml: 1, alignItems: 'center' }}>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                fontSize: '0.86rem',
                fontWeight: 800,
                bgcolor: 'primary.main',
              }}
            >
              {user?.email?.charAt(0).toUpperCase() ?? 'U'}
            </Avatar>
            <Box sx={{ display: { xs: 'none', lg: 'block' }, maxWidth: 190 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                {user?.email?.split('@')[0] ?? 'User'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {user?.email}
              </Typography>
            </Box>
          </Stack>
          <Tooltip title={t('common.logout')}>
            <IconButton aria-label={t('common.logout')} onClick={() => void logout()}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
