// src/components/common/PageLoader.jsx
import { Box, CircularProgress } from '@mui/material';

export default function PageLoader({ minHeight = '60vh' }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight }}>
      <CircularProgress color="primary" size={48} thickness={4} />
    </Box>
  );
}
