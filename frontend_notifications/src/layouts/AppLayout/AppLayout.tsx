import { useCallback, useState } from 'react';
import { Box, Drawer, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';

import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

const DRAWER_WIDTH = 250;

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobileDrawer = useCallback(() => {
    setMobileOpen((value) => !value);
  }, []);

  const closeMobileDrawer = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppHeader drawerWidth={DRAWER_WIDTH} onMenuClick={toggleMobileDrawer} />

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={closeMobileDrawer}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: 0 },
          }}
        >
          <AppSidebar onNavigate={closeMobileDrawer} />
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              borderRight: 0,
            },
          }}
        >
          <AppSidebar />
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          minHeight: '100vh',
          background: (theme) =>
            theme.palette.mode === 'dark'
              ? 'radial-gradient(circle at 82% 5%, rgba(80,91,255,0.08), transparent 24%), #07111f'
              : 'radial-gradient(circle at 82% 5%, rgba(76,117,255,0.08), transparent 24%), #f4f7fb',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 64, md: 76 } }} />
        <Box sx={{ p: { xs: 2, sm: 2.5, lg: 3 }, maxWidth: 1660, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
