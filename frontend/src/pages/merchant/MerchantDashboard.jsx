import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { 
  Box, Typography, Grid, Paper, Stack, Button, IconButton, 
  Switch, FormControlLabel, CircularProgress, Chip, LinearProgress,
  Divider as MuiDivider, List, ListItem, ListItemIcon, ListItemText,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  useTheme, alpha
} from '@mui/material';
import {
  TrendingUp, Star, MonetizationOn, Timer, MoreHoriz, 
  Notifications as NotificationsIcon, Restaurant as RestaurantIcon,
  Settings, EventSeat, Info
} from '@mui/icons-material';

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import MerchantLayout from '@/components/layout/MerchantLayout';
import { 
  fetchMerchantDashboard, 
  updateRestaurantSettings 
} from '@/redux/slices/merchantSlice';

const REVENUE_DATA = [
  { name: 'Mon', value: 4000 },
  { name: 'Tue', value: 3000 },
  { name: 'Wed', value: 5000 },
  { name: 'Thu', value: 4500 },
  { name: 'Fri', value: 6000 },
  { name: 'Sat', value: 8000 },
  { name: 'Sun', value: 7000 },
];


export default function MerchantDashboard() {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  const { data: dashboardData, loading, error } = useSelector((state) => state.merchant.dashboard);
  const restaurant = dashboardData?.restaurant;
  
  useEffect(() => {
    dispatch(fetchMerchantDashboard());
  }, [dispatch]);

  // Logic: In a real app, we'd check if the merchant has a menu or orders
  // If the dashboard returns null or no restaurant, show the welcome screen.
  const isNewMerchant = !loading && !dashboardData?.restaurant && !error;

  const handleToggleReservations = (e) => {
    dispatch(updateRestaurantSettings({ isReservationsEnabled: e.target.checked }));
  };

  if (loading && !dashboardData) {
    return (
      <MerchantLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <CircularProgress color="primary" />
        </Box>
      </MerchantLayout>
    );
  }

  if (isNewMerchant) {
    return (
      <MerchantLayout>
        <Box sx={{ py: 6 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 8, 
              borderRadius: 8, 
              textAlign: 'center', 
              bgcolor: 'white', 
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.02)'
            }}
          >
            <Box sx={{ mb: 4 }}>
               <Box component="img" src="https://cdni.iconscout.com/illustration/premium/thumb/chef-cooking-food-2527763-2117435.png" sx={{ height: 200, opacity: 0.8 }} />
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1, mb: 1 }}>
               Welcome to the <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Kinetic Fleet</Box>
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 6, fontWeight: 500, maxWidth: 600, mx: 'auto' }}>
               Your account has been successfully registered. Let's get your kitchen online and ready for orders.
            </Typography>

            <Grid container spacing={3} sx={{ maxWidth: 900, mx: 'auto' }}>
               {[
                 { title: 'Build Your Menu', desc: 'Add your first dishes and set pricing.', icon: '🍽️', action: '/merchant/menu' },
                 { title: 'Business Profile', desc: 'Set your hours and location.', icon: '📍', action: '/merchant/dashboard' },
                 { title: 'Verification', desc: 'Upload documents for Admin approval.', icon: '📜', action: '#' },
               ].map((step, i) => (
                 <Grid size={{ xs: 12, md: 4 }} key={i}>
                    <Paper 
                      elevation={0} 
                      component={Link}
                      to={step.action}
                      sx={{ 
                        p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)', height: '100%', 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', 
                        transition: '0.3s', textDecoration: 'none', color: 'inherit',
                        '&:hover': { transform: 'translateY(-8px)', borderColor: 'primary.main', boxShadow: '0 12px 30px rgba(0,0,0,0.05)' }
                      }}
                    >
                       <Typography variant="h3" sx={{ mb: 2 }}>{step.icon}</Typography>
                       <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 1 }}>{step.title}</Typography>
                       <Typography variant="caption" color="text.secondary" fontWeight={700}>{step.desc}</Typography>
                    </Paper>
                 </Grid>
               ))}
            </Grid>
          </Paper>
        </Box>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Box sx={{ pb: 8 }}>
        {/* 1. Header & Quick Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
          <Box>
            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1, mb: 0.5 }}>
              Dashboard Overview
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Welcome back, {restaurant?.name}. Here's what's happening today.
            </Typography>
          </Box>
        <Stack direction="row" spacing={2}>
            <Button 
              variant="outlined" 
              startIcon={<Settings />}
              component={Link}
              to="/merchant/profile" 
              sx={{ borderRadius: 3, fontWeight: 700, borderColor: 'divider', color: 'text.primary' }}
            >
              Edit Profile
            </Button>
            <Button 
              variant="contained" 
              startIcon={<NotificationsIcon />}
              onClick={() => alert('No new notifications')}
              sx={{ borderRadius: 3, fontWeight: 900, boxShadow: '0 8px 20px rgba(0,0,0,0.1)' }}
            >
              Notifications
            </Button>
          </Stack>
        </Box>

        {/* 2. Stats Row */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {[
            { label: 'Active Orders', value: dashboardData?.today?.pendingCount || 0, trend: 'Live', icon: <TrendingUp />, color: '#D85830' },
            { label: 'Avg Rating', value: dashboardData?.today?.avgRating || '0.0', trend: `${dashboardData?.today?.totalReviews || 0} reviews`, icon: <Star />, color: '#4D7C5E' },
            { label: 'Today Revenue', value: `₹${dashboardData?.today?.revenue || 0}`, trend: 'Daily', icon: <MonetizationOn />, color: '#2D2926' },
            { label: 'Today Orders', value: dashboardData?.today?.orders || 0, trend: 'Daily', icon: <RestaurantIcon />, color: '#5A3E2B' },
          ].map((stat) => (
            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={stat.label}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white' }}>
                 <Box sx={{ p: 1.2, bgcolor: stat.color, color: 'white', borderRadius: 3, display: 'flex' }}>
                    {stat.icon}
                 </Box>
                 <Box>
                    <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ letterSpacing: 0.5, fontSize: '0.65rem' }}>{stat.label.toUpperCase()}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                       <Typography variant="h5" fontWeight={900} sx={{ fontSize: '1.4rem' }}>{stat.value}</Typography>
                       <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          {stat.trend}
                       </Typography>
                    </Box>
                 </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* 3. Main Content Grid */}
        <Grid container spacing={4}>
          {/* Left Column: Orders & Analytics */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={4}>
              {/* Incoming Orders */}
              <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                  <Typography variant="h6" fontWeight={900}>Pending Orders</Typography>
                  <Button component={Link} to="/merchant/orders" size="small" sx={{ fontWeight: 800 }}>VIEW ALL →</Button>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '0.7rem' }}>ID</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '0.7rem' }}>CUSTOMER</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '0.7rem' }}>WAIT TIME</TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '0.7rem' }}>TOTAL</TableCell>
                        <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '0.7rem' }}>ACTION</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dashboardData?.pendingOrders?.length > 0 ? (
                        dashboardData.pendingOrders.map((order) => (
                          <TableRow key={order._id} hover sx={{ '&:last-child td': { border: 0 } }}>
                            <TableCell sx={{ fontWeight: 900 }}>#{order._id.slice(-5).toUpperCase()}</TableCell>
                            <TableCell sx={{ fontWeight: 800 }}>
                              {order.customerId?.profile?.firstName} {order.customerId?.profile?.lastName}
                            </TableCell>
                            <TableCell>
                              <Chip label={`${order.minutesElapsed}m ago`} size="small" sx={{ fontWeight: 800, bgcolor: order.minutesElapsed > 15 ? 'error.light' : 'success.light', color: 'white' }} />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 900 }}>₹{order.payment?.breakdown?.total}</TableCell>
                            <TableCell align="right">
                              <Button variant="contained" component={Link} to="/merchant/orders" size="small" sx={{ borderRadius: 2, fontWeight: 900, boxShadow: 'none' }}>Handle</Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No pending orders at the moment.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white' }}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 4 }}>Revenue Stream</Typography>
                <Box sx={{ height: 260, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D85830" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#D85830" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#666' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#666' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', fontWeight: 800 }} />
                      <Area type="monotone" dataKey="value" stroke="#D85830" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Stack>
          </Grid>

          {/* Right Column: Settings & Distribution */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={4}>
              {/* Business Settings Control Center */}
              <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box sx={{ p: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 2, display: 'flex' }}>
                    <Settings fontSize="small" />
                  </Box>
                  <Typography variant="h6" fontWeight={900}>Business Settings</Typography>
                </Box>

                <List disablePadding>
                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 40 }}><EventSeat color="action" /></ListItemIcon>
                    <ListItemText 
                      primary={<Typography fontWeight={800} variant="body2">Dine-In Reservations</Typography>} 
                      secondary={<Typography variant="caption" color="text.secondary">Allow guests to book tables online</Typography>}
                    />
                    <Switch 
                      edge="end" 
                      checked={restaurant?.isReservationsEnabled || false} 
                      onChange={handleToggleReservations}
                      color="primary"
                    />
                  </ListItem>
                  
                  <MuiDivider sx={{ my: 1.5, opacity: 0.6 }} />

                  <ListItem disableGutters>
                    <ListItemIcon sx={{ minWidth: 40 }}><RestaurantIcon color="action" /></ListItemIcon>
                    <ListItemText 
                      primary={<Typography fontWeight={800} variant="body2">Restaurant Status</Typography>} 
                      secondary={<Typography variant="caption" color={restaurant?.isOpen ? 'success.main' : 'error.main'}>{restaurant?.isOpen ? 'Currently Open' : 'Currently Closed'}</Typography>}
                    />
                    <Switch 
                      edge="end" 
                      checked={restaurant?.isOpen || false} 
                      disabled // For now, prevent manual toggle here if it should be automated
                      color="success"
                    />
                  </ListItem>
                </List>

                <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.info.main, 0.05), borderRadius: 3, display: 'flex', gap: 2, border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}>
                  <Info sx={{ color: 'info.main', fontSize: 20, mt: 0.2 }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Turning off reservations will hide the booking option from your profile immediately.
                  </Typography>
                </Box>
              </Paper>

              {/* Sentiment Card */}
              <Paper elevation={0} sx={{ p: 4, borderRadius: 5, bgcolor: '#2D2926', color: 'white', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 4 }}>Customer Sentiment</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, justifyContent: 'center', mb: 3 }}>
                   <Chip size="small" label="Authentic" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800 }} />
                   <Chip size="small" label="Great Vibe" sx={{ bgcolor: '#D85830', color: 'white', fontWeight: 900, transform: 'scale(1.1)' }} />
                   <Chip size="small" label="Flavorful" sx={{ bgcolor: '#4D7C5E', color: 'white', fontWeight: 900 }} />
                </Box>
                <Box sx={{ mt: 'auto' }}>
                   <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 900, letterSpacing: 1 }}>SENTIMENT INDEX</Typography>
                   <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                      <Typography variant="h4" fontWeight={900}>{dashboardData?.today?.avgRating ? Math.round((dashboardData.today.avgRating/5)*100) : 0}%</Typography>
                      <LinearProgress variant="determinate" value={dashboardData?.today?.avgRating ? (dashboardData.today.avgRating/5)*100 : 0} sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#4D7C5E', borderRadius: 4 } }} />
                   </Box>
                </Box>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </MerchantLayout>
  );
}
