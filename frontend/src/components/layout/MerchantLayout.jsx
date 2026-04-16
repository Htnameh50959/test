import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, Stack, Divider, IconButton, Button } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  ShoppingBag as OrdersIcon,
  EventNote as BookingsIcon,
  BarChart as AnalyticsIcon,
  RestaurantMenu as MenuIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '@/redux/slices/authSlice';

const SIDEBAR_WIDTH = 280;

const MENU_ITEMS = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/merchant/dashboard' },
  { text: 'Orders', icon: <OrdersIcon />, path: '/merchant/orders' },
  { text: 'Bookings', icon: <BookingsIcon />, path: '/merchant/bookings' },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/merchant/analytics' },
  { text: 'Menu', icon: <MenuIcon />, path: '/merchant/menu' },
  { text: 'Profile', icon: <SettingsIcon />, path: '/merchant/profile' },
];

export default function MerchantLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
    window.location.reload();
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#FBF9F6', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(0,0,0,0.05)',
            bgcolor: '#FFFFFF',
            px: 2,
            py: 4
          },
        }}
      >
        <Box sx={{ px: 2, mb: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
           <Typography variant="h6" fontWeight={900} color="primary.main" sx={{ letterSpacing: -1 }}>
              KINETIC <Box component="span" sx={{ color: 'text.primary' }}>CURATOR</Box>
           </Typography>
        </Box>

        <List sx={{ flexGrow: 1 }}>
          {MENU_ITEMS.map((item) => (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
                sx={{
                  borderRadius: 3,
                  py: 1.5,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(216, 88, 48, 0.08)',
                    color: 'primary.main',
                    '& .MuiListItemIcon-root': { color: 'primary.main' }
                  },
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 45, color: 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                      {item.text}
                    </Typography>
                  } 
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 2, opacity: 0.5 }} />

        <List>
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton 
              component={Link}
              to="/"
              sx={{ 
                borderRadius: 3, 
                py: 1.5,
                color: 'secondary.main',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 45, color: 'inherit' }}><HomeIcon /></ListItemIcon>
              <ListItemText 
                primary={
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                    Back to Home
                  </Typography>
                } 
              />
            </ListItemButton>
          </ListItem>

          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton 
              component={Link}
              to="/merchant/profile"
              sx={{ borderRadius: 3, py: 1.5 }}
            >
              <ListItemIcon sx={{ minWidth: 45 }}><SettingsIcon /></ListItemIcon>
              <ListItemText 
                primary={
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                    Settings
                  </Typography>
                } 
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton 
              onClick={handleLogout}
              sx={{ borderRadius: 3, py: 1.5, color: 'error.main' }}
            >
              <ListItemIcon sx={{ minWidth: 45, color: 'inherit' }}><LogoutIcon /></ListItemIcon>
              <ListItemText 
                primary={
                  <Typography sx={{ fontWeight: 800, fontSize: '0.9rem' }}>
                    Logout
                  </Typography>
                } 
              />
            </ListItemButton>
          </ListItem>
        </List>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src="https://picsum.photos/seed/chef/100" sx={{ width: 40, height: 40 }} />
            <Box>
                <Typography variant="caption" fontWeight={900} display="block">Chef Julian</Typography>
                <Typography variant="caption" color="text.secondary">Main Admin</Typography>
            </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 3, md: 5 }, width: `calc(100% - ${SIDEBAR_WIDTH}px)` }}>
         {/* Top Header */}
         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
            <Box>
               <Typography variant="h4" fontWeight={900}>Good Morning, Chef!</Typography>
               <Typography variant="subtitle2" color="text.secondary">Here's what's happening at your restaurant today.</Typography>
            </Box>
            <Stack direction="row" spacing={2}>
               <IconButton sx={{ bgcolor: 'white', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                  <NotificationsIcon />
               </IconButton>
               <Button 
                variant="contained" 
                component={Link}
                to="/merchant/menu"
                startIcon={<Box component="span">⊕</Box>} 
                sx={{ borderRadius: 10, px: 4 }}
              >
                  Add Item
               </Button>
            </Stack>
         </Box>

         {children}
      </Box>
    </Box>
  );
}
