import { Box, CircularProgress } from '@mui/material';

export function LoadingState() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 240 }}>
      <CircularProgress aria-label="loading" />
    </Box>
  );
}
