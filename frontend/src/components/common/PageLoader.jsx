// src/components/common/PageLoader.jsx
import { Box, CircularProgress, Typography } from '@mui/material';


export default function PageLoader({ minHeight = '60vh' }) {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight,
        animation: 'fadeIn 0.5s ease-out'
      }}
    >
      <Box
        sx={{
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '3px solid rgba(216, 88, 48, 0.1)',
          borderTopColor: 'primary.main',
          animation: 'spin 0.8s linear infinite',
          mb: 2
        }}
      />
      <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ letterSpacing: 2 }}>
        LOADING EXPERIENCE
      </Typography>
    </Box>
  );
}

