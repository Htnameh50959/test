import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, Container, Typography, Paper, Stack, Switch, Button, 
  Card, CardContent, Grid, Divider, IconButton, Badge, 
  CircularProgress, Alert, useTheme, Fade, Zoom, Chip, Avatar
} from '@mui/material';
import { 
  Moped, LocalShipping, AttachMoney, Today, DateRange, 
  NotificationsActive, Directions, CheckCircle, Room, 
  Phone, History, Logout, Settings, PlayArrow, Pause,
  MyLocation, Restaurant, AccountCircle, Timer
} from '@mui/icons-material';
import { useSocket } from '@/hooks/useSocket';
import { 
  setOnlineStatus, addAvailableDelivery, removeAvailableDelivery, 
  fetchCourierEarnings, fetchAvailableDeliveries, acceptDelivery,
  updateDeliveryStatus
} from '@/redux/slices/courierSlice';
import { addToast } from '@/redux/slices/uiSlice';
import { formatCurrency } from '@/utils/formatters';

// ── DELIVERY REQUEST CARD ───────────────────────────────────────────────────

const DeliveryRequestCard = ({ delivery, onAccept, onReject }) => {
  const [countdown, setCountdown] = useState(30);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onReject(delivery._id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <Zoom in={true}>
      <Card sx={{ 
        mb: 2, borderRadius: 6, border: '2px solid', borderColor: 'primary.main',
        boxShadow: '0 12px 32px rgba(216, 88, 48, 0.15)', position: 'relative', overflow: 'visible'
      }}>
        <Box sx={{ 
          position: 'absolute', top: -15, right: 20, bgcolor: 'primary.main', 
          color: 'white', px: 2, py: 0.5, borderRadius: 2, fontWeight: 900,
          display: 'flex', alignItems: 'center', gap: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <Timer fontSize="small" /> {countdown}s
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Stack direction="row" spacing={3} sx={{ alignItems: 'center' }}>

              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={900}>PICKUP</Typography>
                <Typography variant="subtitle1" fontWeight={1000}>{delivery.restaurantId.name}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 150, mx: 'auto' }}>
                  {delivery.restaurantId.profile?.address || 'Restaurant Address'}
                </Typography>
              </Box>
              <Directions color="disabled" />
              <Box sx={{ textAlign: 'center', flex: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={900}>DROP-OFF</Typography>
                <Typography variant="subtitle1" fontWeight={1000}>Customer</Typography>
                <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 150, mx: 'auto' }}>
                   {delivery.deliveryAddress.street}
                </Typography>
              </Box>
            </Stack>

            <Divider />

            <Grid container spacing={2}>
              <Grid size={{ xs: 4 }}>

                <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="body2" fontWeight={1000} color="primary">₹45.00</Typography>
                   <Typography variant="caption" fontWeight={700}>Earning</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>

                <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="body2" fontWeight={1000}>2.4 km</Typography>
                   <Typography variant="caption" fontWeight={700}>Distance</Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 4 }}>

                <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="body2" fontWeight={1000}>18 min</Typography>
                   <Typography variant="caption" fontWeight={700}>Estimated</Typography>
                </Box>
              </Grid>
            </Grid>

            <Stack direction="row" spacing={2}>
              <Button 
                fullWidth variant="outlined" color="inherit" 
                onClick={() => onReject(delivery._id)}
                sx={{ borderRadius: 3, fontWeight: 900 }}
              >
                Decline
              </Button>
              <Button 
                fullWidth variant="contained" 
                onClick={() => onAccept(delivery._id)}
                sx={{ borderRadius: 3, fontWeight: 900 }}
              >
                Accept
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Zoom>
  );
};

// ── ACTIVE DELIVERY VIEW ────────────────────────────────────────────────────

const ActiveDeliveryView = ({ delivery, onUpdateStatus }) => {
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (nextStatus) => {
    setLoading(true);
    await onUpdateStatus(delivery._id, nextStatus);
    setLoading(false);
  };

  const getStatusAction = () => {
    switch(delivery.status) {
      case 'COURIER_ASSIGNED': 
        return { label: 'Confirm Pickup', next: 'PICKED_UP', icon: <Restaurant /> };
      case 'PICKED_UP':
        return { label: 'Start Delivery', next: 'IN_TRANSIT', icon: <Moped /> };
      case 'IN_TRANSIT':
        return { label: 'Record Delivered', next: 'DELIVERED', icon: <CheckCircle /> };
      default: return null;
    }
  };

  const action = getStatusAction();

  return (
    <Fade in={true}>
      <Box>
        <Paper elevation={0} sx={{ p: 3, borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', mb: 3 }}>
           <Typography variant="h6" fontWeight={1000} mb={2}>ACTIVE SHIPMENT</Typography>
           <Stack spacing={2}>
             <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 4 }}>
                <Typography variant="caption" fontWeight={900} color="text.secondary">CUSTOMER CONTACT</Typography>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>

                   <Typography variant="subtitle1" fontWeight={1000}>{delivery.deliveryAddress.street}</Typography>
                   <IconButton color="primary" sx={{ bgcolor: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                      <Phone />
                   </IconButton>
                </Stack>
             </Box>
             
             <Box sx={{ p: 2, bgcolor: 'rgba(216, 88, 48, 0.05)', borderRadius: 4, border: '1px solid rgba(216, 88, 48, 0.1)' }}>
                <Typography variant="caption" fontWeight={900} color="primary">ORDER STATUS</Typography>
                <Typography variant="h5" fontWeight={1000}>{delivery.status.replace(/_/g, ' ')}</Typography>
             </Box>
           </Stack>
        </Paper>

        <Box sx={{ height: 200, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 6, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(0,0,0,0.1)' }}>
           <Stack sx={{ alignItems: 'center' }} spacing={1}>
              <MyLocation color="primary" />
              <Typography variant="caption" fontWeight={800}>LIVE GPS TRACKING ACTIVE</Typography>
           </Stack>
        </Box>

        {action && (
          <Button 
            fullWidth size="large" variant="contained" 
            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : action.icon}
            onClick={() => handleUpdate(action.next)}
            disabled={loading}
            sx={{ borderRadius: 10, py: 2, fontWeight: 900, boxShadow: '0 12px 32px rgba(216, 88, 48, 0.2)' }}
          >
            {action.label}
          </Button>
        )}
      </Box>
    </Fade>
  );
};

// ── COURIER DASHBOARD ────────────────────────────────────────────────────────

export default function CourierDashboard() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const socket = useSocket();

  const { isOnline, activeDelivery, availableDeliveries, earnings, loading } = useSelector(state => state.courier);
  const { user } = useSelector(state => state.auth);

  useEffect(() => {
    dispatch(fetchCourierEarnings());
    if (isOnline) {
      dispatch(fetchAvailableDeliveries());
    }
  }, [dispatch, isOnline]);

  useEffect(() => {
    if (!socket || !isOnline) return;

    socket.emit('courier:go-online');

    const handleNewDelivery = (data) => {
      dispatch(addAvailableDelivery(data));
      dispatch(addToast({ message: 'New order waiting nearby!', severity: 'info' }));
    };

    socket.on('delivery:assigned', handleNewDelivery);

    return () => {
      socket.emit('courier:go-offline');
      socket.off('delivery:assigned');
    };
  }, [socket, isOnline, dispatch]);

  const handleToggleOnline = () => {
    const nextStatus = !isOnline;
    dispatch(setOnlineStatus(nextStatus));
    dispatch(addToast({ 
      message: nextStatus ? 'You are now online' : 'Shift ended. Go home safely!', 
      severity: nextStatus ? 'success' : 'info' 
    }));
  };

  const handleAccept = (orderId) => {
    dispatch(acceptDelivery(orderId));
    dispatch(removeAvailableDelivery(orderId));
  };

  const handleReject = (orderId) => {
    dispatch(removeAvailableDelivery(orderId));
  };

  const handleUpdateStatus = (orderId, status) => {
    dispatch(updateDeliveryStatus({ orderId, status }));
    if (status === 'DELIVERED') {
      dispatch(fetchCourierEarnings());
      dispatch(addToast({ message: 'Delivery completed! Great job.', severity: 'success' }));
    }
  };

  return (
    <Box sx={{ bgcolor: '#F8F9FA', minHeight: '100vh', pb: 10 }}>
       {/* ── TOP NAVIGATION ───────────────────────────────────────────── */}
       <Paper elevation={0} sx={{ p: 2, borderRadius: 0, borderBottom: '1px solid rgba(0,0,0,0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
          <Container maxWidth="sm">
             <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                   <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 1000 }}>{user?.profile?.firstName[0]}</Avatar>
                   <Box>
                      <Typography variant="body1" fontWeight={1000}>{user?.profile?.firstName}</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', mt: -0.5 }}>Courier Partner</Typography>
                   </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                   <Typography variant="caption" fontWeight={900} color={isOnline ? 'success.main' : 'text.disabled'}>
                     {isOnline ? 'ONLINE' : 'OFFLINE'}
                   </Typography>
                   <Switch 
                     checked={isOnline} 
                     onChange={handleToggleOnline} 
                     color="success"
                     sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#4CAF50' } }}
                   />
                </Stack>
             </Stack>
          </Container>
       </Paper>

       <Container maxWidth="sm" sx={{ mt: 3 }}>
          {/* ── EARNINGS DASH ───────────────────────────────────────────── */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, borderRadius: 8, bgcolor: 'primary.main', color: 'white',
              boxShadow: '0 12px 32px rgba(216, 88, 48, 0.25)', mb: 4,
              background: 'linear-gradient(135deg, #D85830 0%, #A04022 100%)'
            }}
          >
             <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                   <Typography variant="caption" fontWeight={900} sx={{ opacity: 0.8 }}>TODAY'S PAYOUT</Typography>
                   <Typography variant="h3" fontWeight={1000}>{formatCurrency(earnings.today)}</Typography>
                </Box>
                <AttachMoney sx={{ fontSize: 40, opacity: 0.5 }} />
             </Stack>
             <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.1)' }} />
             <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>

                   <Typography variant="caption" fontWeight={900} sx={{ opacity: 0.8 }}>THIS WEEK</Typography>
                   <Typography variant="h6" fontWeight={1000}>{formatCurrency(earnings.week)}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>

                   <Typography variant="caption" fontWeight={900} sx={{ opacity: 0.8 }}>THIS MONTH</Typography>
                   <Typography variant="h6" fontWeight={1000}>{formatCurrency(earnings.month)}</Typography>
                </Grid>
             </Grid>
          </Paper>

          {/* ── CONTENT AREA ────────────────────────────────────────────── */}
          {activeDelivery ? (
            <ActiveDeliveryView 
              delivery={activeDelivery} 
              onUpdateStatus={handleUpdateStatus} 
            />
          ) : (
            <Box>
               <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" fontWeight={1000}>NEARBY REQUESTS</Typography>
                  <Chip 
                    label={availableDeliveries.length} 
                    size="small" 
                    color="primary" 
                    sx={{ fontWeight: 1000, borderRadius: 1.5 }} 
                  />
               </Stack>

               {isOnline ? (
                 <Box>
                   {availableDeliveries.map(delivery => (
                     <DeliveryRequestCard 
                       key={delivery._id} 
                       delivery={delivery} 
                       onAccept={handleAccept} 
                       onReject={handleReject}
                     />
                   ))}
                   {availableDeliveries.length === 0 && (
                     <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 6, border: '1px dashed rgba(0,0,0,0.1)', bgcolor: 'transparent' }}>
                        <NotificationsActive color="disabled" sx={{ fontSize: 40, mb: 2 }} />
                        <Typography variant="body1" fontWeight={800} color="text.secondary">Waiting for new orders...</Typography>
                        <Typography variant="caption" fontWeight={700}>We'll notify you as soon as a request pops up.</Typography>
                     </Paper>
                   )}
                 </Box>
               ) : (
                 <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: 8, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
                    <Pause color="primary" sx={{ fontSize: 60, mb: 2 }} />
                    <Typography variant="h5" fontWeight={1000}>Shift Paused</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 4, fontWeight: 700 }}>
                      Go online to start receiving delivery requests in your area.
                    </Typography>
                    <Button 
                      variant="contained" 
                      onClick={handleToggleOnline}
                      startIcon={<PlayArrow />}
                      sx={{ borderRadius: 10, px: 6, fontWeight: 900 }}
                    >
                      GO ONLINE
                    </Button>
                 </Paper>
               )}
            </Box>
          )}
       </Container>

       {/* ── BOTTOM NAV ──────────────────────────────────────────────── */}
       <Paper 
         elevation={10} 
         sx={{ 
           position: 'fixed', bottom: 0, left: 0, right: 0, 
           borderRadius: 0, p: 1, borderTop: '1px solid rgba(0,0,0,0.05)' 
         }}
       >
          <Container maxWidth="sm">
             <Grid container spacing={1}>
                <Grid size={{ xs: 3 }}>

                   <IconButton fullWidth color="primary" sx={{ borderRadius: 4, bgcolor: 'rgba(216, 88, 48, 0.05)' }}>
                      <Today />
                   </IconButton>
                </Grid>
                <Grid size={{ xs: 3 }}>

                   <IconButton fullWidth sx={{ borderRadius: 4 }}>
                      <History />
                   </IconButton>
                </Grid>
                <Grid size={{ xs: 3 }}>

                   <IconButton fullWidth sx={{ borderRadius: 4 }}>
                      <NotificationsActive />
                   </IconButton>
                </Grid>
                <Grid size={{ xs: 3 }}>

                   <IconButton fullWidth sx={{ borderRadius: 4 }}>
                      <Settings />
                   </IconButton>
                </Grid>
             </Grid>
          </Container>
       </Paper>
    </Box>
  );
}
