import { Box } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';

import { AnimatePresence } from 'framer-motion';
import PageTransition from '../common/PageTransition';


export default function AuthLayout() {
    const { pathname } = useLocation();

    return (
      <Box 
        sx={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          bgcolor: '#FBF9F6', 
          p: { xs: 2, md: 4 },
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.02) 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      >
        <AnimatePresence mode="wait">
          <PageTransition key={pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </Box>
    );

}
