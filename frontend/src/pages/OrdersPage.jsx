import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Grid, Paper, Stack,
  Button, Chip, Divider, IconButton, Tabs, Tab,
  Pagination, Skeleton, alpha, useTheme, Avatar
} from '@mui/material';
import {
  Reorder as ReorderIcon,
  RateReview as ReviewIcon,
  Info as InfoIcon,
  ShoppingBag as BagIcon,
  Restaurant as RestaurantIcon,
  ChevronRight as ArrowIcon,
  CalendarToday as DateIcon,
  EventSeat as TableIcon,
  AccessTime as TimeIcon,
  Group as GuestsIcon,
  ConfirmationNumber as BookingIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { 
  fetchOrderHistory, 
  selectOrderHistory, 
  selectOrdersLoading, 
} from '@/redux/slices/ordersSlice';
import { 
  fetchUserBookings, 
  selectUserBookings, 
  selectRestaurantsLoading 
} from '@/redux/slices/restaurantsSlice';
import { addItem } from '@/redux/slices/cartSlice';
import { formatCurrency, formatDate } from '@/utils/formatters';

const OrdersPage = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [activeMainTab, setActiveMainTab] = useState(0); // 0: Orders, 1: Reservations
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const orders = useSelector(selectOrderHistory);
  const bookings = useSelector(selectUserBookings);
  const ordersLoading = useSelector(selectOrdersLoading);
  const bookingsLoading = useSelector(selectRestaurantsLoading);

  useEffect(() => {
    if (activeMainTab === 0) {
      dispatch(fetchOrderHistory({ page, status: filter === 'ALL' ? undefined : filter }));
    } else {
      dispatch(fetchUserBookings());
    }
  }, [dispatch, page, filter, activeMainTab]);

  const handleReorder = (order) => {
    order.items.forEach(item => {
      dispatch(addItem({
        ...item,
        restaurantId: order.restaurantId,
        restaurantName: order.restaurantName || order.restaurant?.name
      }));
    });
    navigate('/checkout');
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED': case 'CONFIRMED': return 'success';
      case 'CANCELLED': return 'error';
      case 'PLACED': case 'PENDING': return 'info';
      default: return 'primary';
    }
  };

  const renderOrders = () => (
    <Stack spacing={3}>
      {ordersLoading && !orders.length ? (
        [1, 2, 3].map(i => (
          <Paper key={i} sx={{ p: 3, borderRadius: 4 }}>
            <Skeleton variant="text" width="40%" height={32} />
            <Skeleton variant="rectangular" height={100} sx={{ mt: 2, borderRadius: 2 }} />
          </Paper>
        ))
      ) : orders.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'transparent', border: '2px dashed', borderColor: 'divider' }}>
          <BagIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" fontWeight={700}>No orders yet</Typography>
          <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 2 }}>Browse Restaurants</Button>
        </Paper>
      ) : (
        orders.map((order) => (
          <Paper key={order._id} elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 8 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}><RestaurantIcon /></Avatar>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>{order.restaurant?.name || 'Restaurant'}</Typography>
                    <Typography variant="caption" color="text.secondary">{formatDate(order.createdAt)}</Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }} sx={{ textAlign: { sm: 'right' } }}>
                <Chip label={order.status} color={getStatusColor(order.status)} size="small" sx={{ fontWeight: 800 }} />
                <Typography variant="subtitle1" fontWeight={900} sx={{ mt: 1 }}>{formatCurrency(order.totals?.total || order.total)}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button variant="contained" size="small" startIcon={<ReorderIcon />} onClick={() => handleReorder(order)}>Reorder</Button>
                  <Button variant="outlined" size="small" onClick={() => navigate(`/orders/${order._id}`)}>Details</Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        ))
      )}
    </Stack>
  );

  const renderReservations = () => (
    <Stack spacing={3}>
      {bookingsLoading ? (
        [1, 2].map(i => <Skeleton key={i} variant="rectangular" height={160} sx={{ borderRadius: 4 }} />)
      ) : bookings.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'transparent', border: '2px dashed', borderColor: 'divider' }}>
          <TableIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" fontWeight={700}>No reservations yet</Typography>
          <Button variant="contained" onClick={() => navigate('/')} sx={{ mt: 2 }}>Reserve a Table</Button>
        </Paper>
      ) : (
        bookings.map((booking) => (
          <Paper key={booking._id} elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 7 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Box sx={{ width: 80, height: 80, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.05), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TableIcon color="primary" sx={{ fontSize: 32 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight={900}>{booking.restaurant?.name || 'Restaurant'}</Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <DateIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="caption" fontWeight={700}>{booking.date}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <TimeIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                        <Typography variant="caption" fontWeight={700}>{booking.timeSlot}</Typography>
                      </Box>
                    </Stack>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }} sx={{ textAlign: { sm: 'right' } }}>
                <Chip label={booking.status || 'CONFIRMED'} color={getStatusColor(booking.status || 'CONFIRMED')} size="small" sx={{ fontWeight: 800, mb: 1 }} />
                <Typography variant="body2" fontWeight={800} color="text.secondary" sx={{ display: 'block' }}>
                  Ref: <Box component="span" sx={{ color: 'primary.main' }}>#{booking._id.slice(-6).toUpperCase()}</Box>
                </Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" display="block">GUESTS</Typography>
                    <Typography variant="body2" fontWeight={800}>{booking.partySize} People</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 3 }}>
                    <Typography variant="caption" color="text.secondary" display="block">TABLE</Typography>
                    <Typography variant="body2" fontWeight={800}>{booking.tableNumber || 'Standard'}</Typography>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }} sx={{ display: 'flex', gap: 1, justifyContent: { sm: 'flex-end' }, alignItems: 'center' }}>
                     <Button size="small" variant="outlined" sx={{ borderRadius: 2 }}>View Details</Button>
                     <Button size="small" color="error" sx={{ borderRadius: 2 }}>Cancel</Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        ))
      )}
    </Stack>
  );

  return (
    <Box sx={{ bgcolor: '#FBF9F6', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        <Typography variant="h3" fontWeight={900} gutterBottom sx={{ mb: 1, letterSpacing: -1 }}>
          Activity Hub
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 5 }}>
          Manage your orders and table reservations in one place.
        </Typography>

        <Box sx={{ mb: 4, display: 'flex', bgcolor: 'white', p: 0.5, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
          <Button 
            fullWidth 
            onClick={() => setActiveMainTab(0)}
            sx={{ 
                borderRadius: 3.5, py: 1.5, fontWeight: 800,
                bgcolor: activeMainTab === 0 ? 'primary.main' : 'transparent',
                color: activeMainTab === 0 ? 'white' : 'text.secondary',
                '&:hover': { bgcolor: activeMainTab === 0 ? 'primary.dark' : 'rgba(0,0,0,0.02)' }
            }}
          >
            FOOD ORDERS
          </Button>
          <Button 
            fullWidth 
            onClick={() => setActiveMainTab(1)}
            sx={{ 
                borderRadius: 3.5, py: 1.5, fontWeight: 800,
                bgcolor: activeMainTab === 1 ? 'primary.main' : 'transparent',
                color: activeMainTab === 1 ? 'white' : 'text.secondary',
                '&:hover': { bgcolor: activeMainTab === 1 ? 'primary.dark' : 'rgba(0,0,0,0.02)' }
            }}
          >
            TABLE RESERVATIONS
          </Button>
        </Box>

        {activeMainTab === 0 ? renderOrders() : renderReservations()}

        {activeMainTab === 0 && orders.length > 0 && (
          <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
            <Pagination count={5} page={page} onChange={(_, val) => setPage(val)} color="primary" />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default OrdersPage;
