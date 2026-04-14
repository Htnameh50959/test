import React from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Avatar, 
  Button 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HomeIcon from '@mui/icons-material/Home';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import HistoryIcon from '@mui/icons-material/History';
import PersonIcon from '@mui/icons-material/Person';
import LoginIcon from '@mui/icons-material/Login';
import AppRegistrationIcon from '@mui/icons-material/AppRegistration';
import { useNavigate } from 'react-router-dom';

const MobileSidebar = ({ open, onClose, user, onLogout }) => {
  const navigate = useNavigate();

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Restaurants', icon: <RestaurantIcon />, path: '/restaurants' },
    { text: 'Special Offers', icon: <LocalOfferIcon />, path: '/offers' },
  ];

  const userItems = [
    { text: 'My Profile', icon: <PersonIcon />, path: '/profile' },
    { text: 'My Orders', icon: <HistoryIcon />, path: '/orders' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: 280, display: 'flex', flexDirection: 'column' }
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee' }}>
        <Typography variant="h6" color="primary" fontWeight="bold">
          FoodieHub
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* User Info */}
      <Box sx={{ px: 2, py: 3, bgcolor: '#fbfbfb' }}>
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
              {user.firstName?.[0] || user.email?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user.email}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Join FoodieHub for a better experience!
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                variant="contained" 
                size="small" 
                fullWidth
                onClick={() => handleNavigation('/login')}
              >
                Login
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                fullWidth
                onClick={() => handleNavigation('/register')}
              >
                Register
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Navigation Links */}
      <List sx={{ flex: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => handleNavigation(item.path)}>
              <ListItemIcon sx={{ color: 'primary.main', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}

        {user && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', fontWeight: 'bold' }}>
              My Account
            </Typography>
            {userItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton onClick={() => handleNavigation(item.path)}>
                  <ListItemIcon sx={{ color: 'text.secondary', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </>
        )}
      </List>

      {/* Footer / Logout */}
      {user && (
        <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
          <Button 
            fullWidth 
            color="error" 
            startIcon={<LoginIcon />}
            onClick={() => {
              onLogout();
              onClose();
            }}
          >
            Logout
          </Button>
        </Box>
      )}
    </Drawer>
  );
};

export default MobileSidebar;
