import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  InputBase,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Receipt,
  AccountCircle,
  Menu as MenuIcon,
  Search as SearchIcon,
  MyLocation as MyLocationIcon,
  LocationOn,
  ExitToApp,
  Store,
  Security,
  FavoriteBorder,
  NotificationsOutlined,
  EmojiEvents,
  ConfirmationNumber,
} from '@mui/icons-material';
import { useSelector, useDispatch } from 'react-redux';

import { selectIsAuthenticated, selectUser, logout } from '@/redux/slices/authSlice';
import { selectUnreadCount, fetchNotifications } from '@/redux/slices/notificationsSlice';
import CartIcon from '../cart/CartIcon';

export default function Header({ onMobileMenuOpen }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const unreadCount = useSelector(selectUnreadCount);

  const [anchorEl, setAnchorEl] = useState(null);
  const [location, setLocation] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
    }
  }, [isAuthenticated, dispatch]);

  const initials = user
    ? `${user.profile?.firstName?.[0] ?? ''}${user.profile?.lastName?.[0] ?? ''}`.toUpperCase() || 'U'
    : '';

  const handleLocationDetection = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, you'd reverse geocode here
          setLocation(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        },
        (error) => console.error('Error getting location:', error)
      );
    }
  };

  return (
    <AppBar 
      position="sticky" 
      elevation={0} 
      sx={{ 
        bgcolor: alpha('#FFFFFF', 0.8),
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)', // Safari support
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: alpha(theme.palette.divider, 0.1),
        zIndex: theme.zIndex.drawer + 1,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >

      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1, sm: 2, md: 4 } }}>
        {/* Left: Menu & Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {isMobile && (
            <IconButton 
              edge="start" 
              color="inherit" 
              onClick={onMobileMenuOpen} 
              sx={{ mr: 1 }}
              aria-label="open drawer"
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            component={Link}
            to="/"
            variant="h6"
            fontWeight={900}
            color="primary"
            sx={{ 
              textDecoration: 'none', 
              display: 'flex', 
              alignItems: 'center',
              fontSize: { xs: '1.1rem', sm: '1.4rem' },
              letterSpacing: '-0.03em',
              mr: 4
            }}
          >
            The Kinetic Curator
          </Typography>

          {!isMobile && (
            <Stack direction="row" spacing={4} sx={{ ml: 4 }}>
              {[
                { label: 'Explore', path: '/' },
                { label: 'Restaurants', path: '/search' },
                { label: 'Events', path: '/events' },
                ...(isAuthenticated ? [{ label: 'My Orders', path: '/orders' }] : []),
              ].map(item => (
                <Typography
                  key={item.label}
                  variant="subtitle2"
                  component={Link}
                  to={item.path}
                  sx={{ 
                    textDecoration: 'none', 
                    color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                    fontWeight: 800,
                    letterSpacing: '0.02em',
                    position: 'relative',
                    transition: 'color 0.2s',
                    '&:after': {
                      content: '""',
                      position: 'absolute',
                      bottom: -4,
                      left: 0,
                      width: location.pathname === item.path ? '100%' : '0%',
                      height: '2px',
                      bgcolor: 'primary.main',
                      transition: 'width 0.3s ease'
                    },
                    '&:hover': { 
                      color: 'primary.main',
                      '&:after': { width: '100%' }
                    }
                  }}
                >
                  {item.label}
                </Typography>
              ))}
            </Stack>
          )}
        </Box>

        {/* Center: Empty for minimalist premium feel or secondary search */}
        {!isMobile && (
          <Box sx={{ flex: 1 }} />
        )}

        {/* Right: User actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1 } }}>
          {/* Cart Icon & Drawer Trigger */}
          <CartIcon />

          {isAuthenticated && !isMobile && (
            <>
              <Tooltip title="Favorites">
                <IconButton onClick={() => navigate('/favorites')} size="small" sx={{ color: 'text.secondary' }}>
                  <FavoriteBorder />
                </IconButton>
              </Tooltip>
              <Tooltip title="Notifications">
                <IconButton onClick={() => navigate('/notifications')} size="small" sx={{ color: 'text.secondary' }}>
                  <Badge badgeContent={unreadCount > 0 ? unreadCount : null} color="error" max={9}>
                    <NotificationsOutlined />
                  </Badge>
                </IconButton>
              </Tooltip>
            </>
          )}


          {isAuthenticated ? (
            <>
              <IconButton 
                onClick={(e) => setAnchorEl(e.currentTarget)} 
                sx={{ p: 0.5 }}
                aria-label="user profile"
              >
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    bgcolor: 'primary.main', 
                    fontSize: 14, 
                    fontWeight: 700 
                  }}
                >
                  {initials}
                </Avatar>
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                PaperProps={{ 
                  elevation: 4,
                  sx: { mt: 1.5, minWidth: 200, borderRadius: 2 } 
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {user?.profile?.firstName} {user?.profile?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={() => { navigate('/profile'); setAnchorEl(null); }}>
                  <AccountCircle fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Profile
                </MenuItem>

                {user?.role === 'merchant' && (
                  <MenuItem onClick={() => { navigate('/merchant/dashboard'); setAnchorEl(null); }}>
                     <Store fontSize="small" sx={{ mr: 1.5, color: 'primary.main' }} /> Merchant Hub
                  </MenuItem>
                )}

                {user?.role === 'admin' && (
                  <MenuItem onClick={() => { navigate('/admin/dashboard'); setAnchorEl(null); }}>
                     <Security fontSize="small" sx={{ mr: 1.5, color: '#1D3557' }} /> Admin Panel
                  </MenuItem>
                )}

                <MenuItem onClick={() => { navigate('/orders'); setAnchorEl(null); }}>
                  <Receipt fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> My Orders
                </MenuItem>
                <MenuItem onClick={() => { navigate('/favorites'); setAnchorEl(null); }}>
                  <FavoriteBorder fontSize="small" sx={{ mr: 1.5, color: 'error.main' }} /> My Favorites
                </MenuItem>
                <MenuItem onClick={() => { navigate('/loyalty'); setAnchorEl(null); }}>
                  <EmojiEvents fontSize="small" sx={{ mr: 1.5, color: '#FFB300' }} /> Loyalty & Rewards
                </MenuItem>
                <MenuItem onClick={() => { navigate('/notifications'); setAnchorEl(null); }}>
                  <Badge badgeContent={unreadCount > 0 ? unreadCount : null} color="error">
                    <NotificationsOutlined fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} />
                  </Badge>
                  <Box component="span" sx={{ ml: 1.5 }}>Notifications</Box>
                </MenuItem>
                <Divider />
                <MenuItem 
                  onClick={() => { 
                    dispatch(logout()); 
                    setAnchorEl(null);
                    navigate('/');
                    window.location.reload(); 
                  }}
                  sx={{ color: 'error.main', fontWeight: 700 }}
                >
                  <ExitToApp fontSize="small" sx={{ mr: 1.5 }} /> Sign Out
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Stack direction="row" spacing={1}>
              {!isMobile && (
                <Button 
                  component={Link} 
                  to="/login" 
                  variant="text" 
                  color="inherit"
                  sx={{ fontWeight: 600 }}
                >
                  Login
                </Button>
              )}
              <Button 
                component={Link} 
                to="/register" 
                variant="contained"
                sx={{ borderRadius: 6, fontWeight: 700 }}
              >
                Sign Up
              </Button>
            </Stack>
          )}
        </Box>
      </Toolbar>
      
      {/* Mobile Search Bar (Only on Mobile) */}
      {isMobile && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              bgcolor: '#f5f5f5',
              borderRadius: 2,
              px: 1.5,
              py: 0.5,
            }}
          >
            <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
            <InputBase
              placeholder="Search dishes or restaurants"
              fullWidth
              sx={{ fontSize: '0.85rem' }}
            />
          </Paper>
        </Box>
      )}
    </AppBar>
  );
}
