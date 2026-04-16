import { Box, CssBaseline } from '@mui/material';

import { useSelector, useDispatch } from 'react-redux';
import Header from './Header';
import { selectUser, logout, selectIsAuthenticated, fetchProfile } from '@/redux/slices/authSlice';
import { fetchCart } from '@/redux/slices/cartSlice';
import ToastContainer from '../common/ToastContainer';
import { useEffect, useState, lazy, Suspense } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import nprogress from 'nprogress';
import 'nprogress/nprogress.css';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '../common/PageTransition';
import usePageTracking from '@/hooks/usePageTracking';

// Lazily load global UI that isn't critical for first paint
const Footer          = lazy(() => import('./Footer'));
const MobileSidebar   = lazy(() => import('./MobileSidebar'));
const CartDrawer      = lazy(() => import('../cart/CartDrawer'));
const CartConflictModal = lazy(() => import('../cart/CartConflictModal'));


export default function AppLayout() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Activate Page Tracking for Analytics
  usePageTracking();

  // 1. Sync auth and cart on mount
  useEffect(() => {
    if (isAuthenticated) {
      if (!user) {
        dispatch(fetchProfile());
      }
      dispatch(fetchCart());
    }
  }, [dispatch, isAuthenticated, user]);

  // 2. Navigation progress and scroll to top
  useEffect(() => {
    nprogress.start();
    window.scrollTo(0, 0);
    nprogress.done();
  }, [pathname]);


  const handleSidebarOpen = () => setIsSidebarOpen(true);
  const handleSidebarClose = () => setIsSidebarOpen(false);

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Header with sidebar trigger */}
      <Header onMobileMenuOpen={handleSidebarOpen} />

      {/* Mobile Side Drawer */}
      <Suspense fallback={null}>
        <MobileSidebar 
          open={isSidebarOpen} 
          onClose={handleSidebarClose} 
          user={user}
          onLogout={handleLogout}
        />
      </Suspense>

      {/* Main Content Area */}
      <Box 
        component="main" 
        sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default'
        }}
      >
        <AnimatePresence mode="wait">
          <PageTransition key={pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </Box>


      {/* Professional Footer */}
      <Suspense fallback={null}>
        <Footer />
      </Suspense>

      {/* Global Notifications & Modals */}
      <ToastContainer />
      <Suspense fallback={null}>
        <CartDrawer />
        <CartConflictModal />
      </Suspense>
    </Box>
  );
}
