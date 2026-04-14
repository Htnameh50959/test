import React from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, Stack, Divider, IconButton, Button } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PeopleAlt as UsersIcon,
  Store as MerchantsIcon,
  ReceiptLong as TransactionsIcon,
  GppGood as VerificationIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '@/redux/slices/authSlice';

const SIDEBAR_WIDTH = 280;

const MENU_ITEMS = [
  { text: 'Overview', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { text: 'Users', icon: <UsersIcon />, path: '/admin/users' },
  { text: 'Merchants', icon: <MerchantsIcon />, path: '/admin/merchants' },
  { text: 'Verifications', icon: <VerificationIcon />, path: '/admin/verifications' },
  { text: 'Transactions', icon: <TransactionsIcon />, path: '/admin/transactions' },
  { text: 'Analytics', icon: <ReportsIcon />, path: '/admin/analytics' },
];

export default function AdminLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
    window.location.reload();
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#FBF9F6', minHeight: '100vh', width: '100vw', overflowX: 'hidden' }}>
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
            bgcolor: '#1D3557', // Darker Blue for Admin
            color: 'white',
            px: 2,
            py: 4
          },
        }}
      >
        <Box sx={{ px: 2, mb: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
           <AdminIcon sx={{ fontSize: 32, color: 'white' }} />
           <Typography variant="h6" fontWeight={900} sx={{ letterSpacing: -1, color: 'white' }}>
              ADMIN <Box component="span" sx={{ opacity: 0.6 }}>CORE</Box>
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
                  color: 'rgba(255,255,255,0.7)',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    '& .MuiListItemIcon-root': { color: 'white' }
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                }}
              >
                <ListItemIcon sx={{ minWidth: 45, color: 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 800, fontSize: '0.9rem' }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>

        <Divider sx={{ my: 4, bgcolor: 'rgba(255,255,255,0.1)' }} />

        <List>
          <ListItem disablePadding sx={{ mb: 1 }}>
            <ListItemButton sx={{ borderRadius: 3, py: 1.5, color: 'rgba(255,255,255,0.7)' }}>
              <ListItemIcon sx={{ minWidth: 45, color: 'inherit' }}><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Settings" primaryTypographyProps={{ fontWeight: 800, fontSize: '0.9rem' }} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton 
              onClick={handleLogout}
              sx={{ borderRadius: 3, py: 1.5, color: '#E63946' }}
            >
              <ListItemIcon sx={{ minWidth: 45, color: 'inherit' }}><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 800, fontSize: '0.9rem' }} />
            </ListItemButton>
          </ListItem>
        </List>

        <Box sx={{ mt: 4, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: 'white', color: '#1D3557', fontWeight: 900 }}>A</Avatar>
            <Box>
                <Typography variant="caption" fontWeight={900} display="block" sx={{ color: 'white' }}>Super Admin</Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>System Master</Typography>
            </Box>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 3, md: 5 }, width: `calc(100% - ${SIDEBAR_WIDTH}px)` }}>
         {children}
      </Box>
    </Box>
  );
}
