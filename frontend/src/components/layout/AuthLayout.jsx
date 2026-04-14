import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: '#FBF9F6', // Standard Kinetic Background
        p: { xs: 2, md: 4 },
        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0)',
        backgroundSize: '40px 40px'
      }}
    >
      <Outlet />
    </Box>
  );
}
