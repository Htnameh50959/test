import { useState } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Header from './Header';
import Footer from './Footer';
import MobileSidebar from './MobileSidebar';
import Toast from '../common/Toast';
import { selectUser, logout, selectIsAuthenticated } from '@/redux/slices/authSlice';
import { fetchCart } from '@/redux/slices/cartSlice';
import CartDrawer from '../cart/CartDrawer';
import { CartConflictModal } from '../cart/CartConflictModal';
import ToastContainer from '../common/ToastContainer';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function AppLayout() {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Sync cart from server on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart());
    }
  }, [dispatch, isAuthenticated]);

  // 2. Automated scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
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
      <MobileSidebar 
        open={isSidebarOpen} 
        onClose={handleSidebarClose} 
        user={user}
        onLogout={handleLogout}
      />

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
        <Outlet />
      </Box>

      {/* Professional Footer */}
      <Footer />

      {/* Global Notifications & Modals */}
      <ToastContainer />
      <CartDrawer />
      <CartConflictModal />
    </Box>
  );
}
