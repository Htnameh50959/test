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
    { text: 'Explore', icon: <HomeIcon />, path: '/' },
    { text: 'Restaurants', icon: <RestaurantIcon />, path: '/search' },
    { text: 'My Activity', icon: <HistoryIcon />, path: '/orders' },
  ];

  const userItems = [
    { text: 'My Profile', icon: <PersonIcon />, path: '/profile' },
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
        sx: { 
          width: 280, 
          display: 'flex', 
          flexDirection: 'column',
          bgcolor: '#FBFBFB' 
        }
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
        <Typography variant="h6" color="primary" fontWeight={900} sx={{ letterSpacing: -1 }}>
          THE KINETIC <Box component="span" sx={{ color: 'text.primary' }}>CURATOR</Box>
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* User Info */}
      <Box sx={{ px: 2.5, py: 4 }}>
        {user ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 52, height: 52, boxShadow: '0 4px 12px rgba(216, 88, 48, 0.2)' }}>
              {user.firstName?.[0] || user.email?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.2 }}>
                {user.firstName} {user.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {user.email}
              </Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)' }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 2, lineHeight: 1.4 }}>
              Unlock the full gourmet experience.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button 
                variant="contained" 
                size="small" 
                fullWidth
                onClick={() => handleNavigation('/login')}
                sx={{ borderRadius: 2, fontWeight: 900 }}
              >
                Login
              </Button>
              <Button 
                variant="outlined" 
                size="small" 
                fullWidth
                onClick={() => handleNavigation('/register')}
                sx={{ borderRadius: 2, fontWeight: 800 }}
              >
                Join
              </Button>
            </Stack>
          </Box>
        )}
      </Box>

      <Divider sx={{ mx: 2.5, opacity: 0.5 }} />

      {/* Navigation Links */}
      <List sx={{ flex: 1, px: 1.5, py: 2 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
                onClick={() => handleNavigation(item.path)}
                sx={{ 
                    borderRadius: 3,
                    py: 1.5,
                    '&:hover': { bgcolor: 'rgba(216, 88, 48, 0.04)' }
                }}
            >
              <ListItemIcon sx={{ color: 'primary.main', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ fontWeight: 800, fontSize: '0.95rem' }} 
              />
            </ListItemButton>
          </ListItem>
        ))}

        {user && (
          <>
            <Divider sx={{ my: 2, mx: 1, opacity: 0.5 }} />
            <Typography variant="caption" sx={{ px: 2, mb: 1, display: 'block', color: 'text.secondary', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>
              Personal
            </Typography>
            {userItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton 
                    onClick={() => handleNavigation(item.path)}
                    sx={{ borderRadius: 3, py: 1.5 }}
                >
                  <ListItemIcon sx={{ color: 'text.secondary', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{ fontWeight: 800, fontSize: '0.95rem' }} 
                  />
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
