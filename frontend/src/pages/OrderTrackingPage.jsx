// src/pages/OrderTrackingPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CircularProgress,
  Container,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Step,
  Stepper,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Restaurant as RestaurantIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { fetchOrderById, selectCurrentOrder, selectOrdersLoading } from '@/redux/slices/ordersSlice';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { formatCurrency, formatTime } from '@/utils/formatters';

// Fix Vite breaking Leaflet's default marker icon asset paths
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const CourierMarker = L.divIcon({
  html: '🛵',
  className: 'courier-marker',
  iconSize: [40, 40]
});

const OrderTrackingPage = () => {
  const { id } = useParams();
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const order = useSelector(selectCurrentOrder);
  const loading = useSelector(selectOrdersLoading);
  const { orderStatus: liveStatus, courierLocation, eta: liveEta } = useOrderTracking(id);

  useEffect(() => {
    dispatch(fetchOrderById(id));
  }, [id, dispatch]);

  const currentStatus = liveStatus || order?.status || 'PLACED';
  const eta = liveEta || order?.estimatedDeliveryAt;

  if (loading && !order) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 20 }}><CircularProgress /></Box>;
  }

  if (!order) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
        <Typography variant="h5" color="text.secondary">Order not found.</Typography>
        <Button onClick={() => navigate('/orders')} sx={{ mt: 2 }}>Back to My Orders</Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#FBF9F6', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="xl">
        {/* Header Section */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h1" sx={{ fontSize: '3.5rem', mb: 1, letterSpacing: '-0.04em' }}>
            Your <Box component="span" sx={{ fontStyle: 'italic' }}>Curated Order</Box>
          </Typography>
          <Typography variant="subtitle2" fontWeight={800} color="text.secondary">
            Order #TKC-{order._id?.slice(-5).toUpperCase() || '88291'} • Expected Arrival: {eta ? formatTime(eta) : '12:45 PM'}
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* 1. Left Sidebar: Order Summary & Info */}
          <Grid size={{ xs: 12, lg: 3 }}>
            <Stack spacing={4}>
              {/* Order Summary Card */}
              <Paper sx={{ p: 4, borderRadius: 6, boxShadow: '0 8px 30px rgba(0,0,0,0.03)' }}>
                <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <RestaurantIcon sx={{ color: 'primary.main', fontSize: 20 }} /> Order Summary
                </Typography>
                
                <Stack spacing={3}>
                  {(order.items || []).map((item, i) => (
                    <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                       <Avatar src={`https://picsum.photos/seed/${i}/120`} variant="rounded" sx={{ width: 56, height: 56, borderRadius: 2 }} />
                       <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" fontWeight={800} sx={{ lineHeight: 1.2 }}>{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{formatCurrency(item.price)}</Typography>
                       </Box>
                    </Box>
                  ))}
                </Stack>
              </Paper>

              {/* Reservation Info Card */}
              <Paper sx={{ p: 4, borderRadius: 6, borderLeft: '6px solid', borderColor: 'success.main', bgcolor: '#FBF9F6' }}>
                 <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box component="span" sx={{ fontSize: 20 }}>☰</Box> Reservation Fixed
                 </Typography>
                 <Typography variant="subtitle2" fontWeight={800}>{order.restaurant?.name || 'The Rooftop Lounge'}</Typography>
                 <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, fontWeight: 700 }}>
                    📅 {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                 </Typography>
                 <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700 }}>
                    🕒 8:30 PM • 2 People
                 </Typography>
              </Paper>
            </Stack>
          </Grid>

          {/* 2. Middle: Live Map Discovery */}
          <Grid size={{ xs: 12, lg: 6 }}>
            <Stack spacing={4}>
              <Paper sx={{ 
                height: 550, 
                borderRadius: 8, 
                overflow: 'hidden', 
                position: 'relative',
                bgcolor: '#e5e5e5',
                border: '1px solid rgba(0,0,0,0.05)'
              }}>
                <MapContainer 
                  center={courierLocation ? [courierLocation.lat, courierLocation.lng] : [17.3850, 78.4867]} 
                  zoom={15} 
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  {courierLocation && <Marker position={[courierLocation.lat, courierLocation.lng]} icon={CourierMarker} />}
                  {order.deliveryAddress?.location?.coordinates && (
                    <Marker position={[order.deliveryAddress.location.coordinates[1], order.deliveryAddress.location.coordinates[0]]} />
                  )}
                </MapContainer>
                
                {/* Floating Map Label */}
                <Box sx={{ 
                  position: 'absolute', 
                  bottom: 30, 
                  left: '50%', 
                  transform: 'translateX(-50%)',
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  zIndex: 10
                }}>
                  <Typography variant="h1" sx={{ fontSize: '3rem', opacity: 0.5 }}>SAFE VIEW</Typography>
                </Box>

                {/* Tracking Step Overlay */}
                <Paper sx={{ 
                  position: 'absolute', 
                  top: 30, 
                  right: 30, 
                  p: 2, 
                  borderRadius: 4, 
                  bgcolor: 'rgba(255,255,255,0.9)', 
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  zIndex: 20
                }}>
                   <HomeIcon sx={{ color: 'text.secondary' }} />
                   <Box>
                      <Typography variant="subtitle2" fontWeight={900}>Home</Typography>
                      <Typography variant="caption" color="text.secondary">{order.deliveryAddress?.street || 'West 23rd St, NYC'}</Typography>
                   </Box>
                </Paper>
              </Paper>

              {/* Status Stepper Card */}
              <Paper sx={{ p: 4, borderRadius: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                   <Typography variant="h5" fontWeight={900} color="primary" sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <Box component="span" className="pulse-dot" sx={{ width: 10, height: 10, bgcolor: 'primary.main', borderRadius: '50%' }} />
                      Courier is approaching your destination
                   </Typography>
                   <Typography variant="caption" color="text.secondary" fontWeight={700}>Last updated 2 mins ago via Satellite Link</Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 3, sm: 6 } }}>
                  {['Preparing', 'Picked Up', 'On the Way', 'Delivered'].map((step, idx) => (
                    <Box key={step} sx={{ position: 'relative', textAlign: 'center' }}>
                       <Box sx={{ 
                          width: 56, 
                          height: 56, 
                          borderRadius: '50%', 
                          bgcolor: idx <= 2 ? 'success.main' : 'rgba(0,0,0,0.05)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mb: 1.5,
                          position: 'relative',
                          zIndex: 2,
                          boxShadow: idx === 2 ? '0 0 20px rgba(77, 124, 94, 0.4)' : 'none',
                          animation: idx === 2 ? 'pulse 2s infinite' : 'none'
                       }}>
                          {idx === 0 && '✔'}
                          {idx === 1 && '✔'}
                          {idx === 2 && '🛵'}
                          {idx === 3 && '🏠'}
                       </Box>
                       <Typography variant="caption" fontWeight={900} color={idx === 2 ? 'primary.main' : 'text.secondary'}>
                          {step.toUpperCase()}
                       </Typography>
                       {/* Connection Line */}
                       {idx < 3 && (
                         <Box sx={{ 
                            position: 'absolute', 
                            top: 28, 
                            left: 56, 
                            width: { xs: 16, sm: 48 }, 
                            height: 4, 
                            bgcolor: idx < 2 ? 'success.main' : 'divider',
                            zIndex: 1,
                            borderRadius: 2
                         }} />
                       )}
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Stack>
          </Grid>

          {/* 3. Right Sidebar: Payment & Courier */}
          <Grid size={{ xs: 12, lg: 3 }}>
            <Stack spacing={4}>
              {/* Payment Overview */}
              <Paper sx={{ p: 4, borderRadius: 6 }}>
                <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 4 }}>Payment Overview</Typography>
                <Stack spacing={2} sx={{ mb: 4 }}>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                      <Typography variant="body2" fontWeight={800}>{formatCurrency(order.payment?.breakdown?.subtotal || 0)}</Typography>
                   </Box>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Delivery Fee</Typography>
                      <Typography variant="body2" fontWeight={800}>{formatCurrency(order.payment?.breakdown?.deliveryFee || 0)}</Typography>
                   </Box>
                   <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Service Fee</Typography>
                      <Typography variant="body2" fontWeight={800}>{formatCurrency(order.payment?.breakdown?.serviceFee || 0)}</Typography>
                   </Box>
                   {order.payment?.breakdown?.discount > 0 && (
                     <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="success.main" fontWeight={700}>Discount</Typography>
                        <Typography variant="body2" color="success.main" fontWeight={800}>-{formatCurrency(order.payment.breakdown.discount)}</Typography>
                     </Box>
                   )}
                </Stack>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <Typography variant="h5" fontWeight={900}>Total</Typography>
                   <Typography variant="h5" fontWeight={900}>{formatCurrency(order.payment?.breakdown?.total || 0)}</Typography>
                </Box>

              </Paper>

              {/* Rewards Status */}
              <Paper sx={{ p: 4, borderRadius: 6, bgcolor: alpha(theme.palette.success.main, 0.08), border: 'none' }}>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box component="span" sx={{ p: 0.5, bgcolor: 'success.main', color: 'white', borderRadius: 1, fontSize: 14 }}>★</Box>
                    <Typography variant="subtitle2" fontWeight={900} color="success.dark">Rewards Status</Typography>
                 </Box>
                 <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: 'block', mb: 2 }}>
                    You're earning <Box component="span" sx={{ fontWeight: 900, color: 'text.primary' }}>124 points</Box> with this order.
                 </Typography>
                 <LinearProgress 
                  variant="determinate" 
                  value={75} 
                  sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.05)', '& .MuiLinearProgress-bar': { bgcolor: 'success.main' } }} 
                 />
              </Paper>

              <Stack spacing={2}>
                 <Button fullWidth variant="contained" startIcon={<PhoneIcon />} sx={{ py: 2 }}>
                    Contact Courier
                 </Button>
                 <Button fullWidth variant="contained" sx={{ bgcolor: 'rgba(0,0,0,0.08)', color: 'text.primary', '&:hover': { bgcolor: 'rgba(0,0,0,0.12)' }, py: 2 }}>
                    Support Center
                 </Button>
              </Stack>

              <Paper sx={{ p: 2, borderRadius: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
                 <Avatar src="https://picsum.photos/seed/courier/100" sx={{ width: 64, height: 64, borderRadius: 3 }} />
                 <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={900}>Your Courier</Typography>
                    <Typography variant="subtitle2" fontWeight={900}>Marcus V.</Typography>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 700 }}>
                       ★ 4.9 (2k+ deliveries)
                    </Typography>
                 </Box>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Container>
      <style>{`
        .courier-marker {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(77, 124, 94, 0.4); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(77, 124, 94, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(77, 124, 94, 0); }
        }
        .pulse-dot {
          animation: pulse 1.5s infinite;
        }
      `}</style>
    </Box>
  );
};

export default OrderTrackingPage;
