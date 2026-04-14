// src/pages/OrdersPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Grid, Paper, Stack,
  Button, Chip, Divider, IconButton, Tabs, Tab,
  Pagination, Skeleton, alpha, useTheme
} from '@mui/material';
import {
  Reorder as ReorderIcon,
  RateReview as ReviewIcon,
  Info as InfoIcon,
  ShoppingBag as BagIcon,
  Restaurant as RestaurantIcon,
  ChevronRight as ArrowIcon,
  CalendarToday as DateIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import { 
  fetchOrderHistory, 
  selectOrderHistory, 
  selectOrdersLoading, 
  selectOrdersError 
} from '@/redux/slices/ordersSlice';
import { addItem } from '@/redux/slices/cartSlice';
import { formatCurrency, formatDate } from '@/utils/formatters';

const OrdersPage = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const orders = useSelector(selectOrderHistory);
  const loading = useSelector(selectOrdersLoading);
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchOrderHistory({ page, status: filter === 'ALL' ? undefined : filter }));
  }, [dispatch, page, filter]);

  const handleReorder = (order) => {
    // Add all items from previous order to cart
    order.items.forEach(item => {
      dispatch(addItem({
        ...item,
        restaurantId: order.restaurantId,
        restaurantName: order.restaurantName || order.restaurant?.name
      }));
    });
    // Navigate to checkout or show success
    navigate('/checkout');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DELIVERED': return 'success';
      case 'CANCELLED': return 'error';
      case 'PLACED': return 'info';
      default: return 'primary';
    }
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 6 }}>
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight={900} gutterBottom sx={{ mb: 4 }}>
          My Orders
        </Typography>

        {/* Filters */}
        <Tabs 
          value={filter} 
          onChange={(_, val) => setFilter(val)}
          sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="All Orders" value="ALL" sx={{ fontWeight: 700 }} />
          <Tab label="Delivered" value="DELIVERED" sx={{ fontWeight: 700 }} />
          <Tab label="Cancelled" value="CANCELLED" sx={{ fontWeight: 700 }} />
        </Tabs>

        {/* Orders List */}
        <Stack spacing={3}>
          {loading && !orders.length ? (
            [1, 2, 3].map(i => (
              <Paper key={i} sx={{ p: 3, borderRadius: 4 }}>
                <Skeleton variant="text" width="40%" height={32} />
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="rectangular" height={100} sx={{ mt: 2, borderRadius: 2 }} />
              </Paper>
            ))
          ) : orders.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
              <BagIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" fontWeight={700}>No orders yet</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                You haven't placed any orders yet. Ready to eat?
              </Typography>
              <Button variant="contained" onClick={() => navigate('/')}>Browse Restaurants</Button>
            </Paper>
          ) : (
            orders.map((order) => (
              <Paper 
                key={order._id || order.id} 
                elevation={0}
                sx={{ 
                  p: 3, 
                  borderRadius: 4, 
                  border: '1px solid', 
                  borderColor: 'divider',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                    borderColor: 'primary.light'
                  }
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={8}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Box sx={{ 
                        width: 64, height: 64, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.1),
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <RestaurantIcon color="primary" />
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight={800}>{order.restaurant?.name || 'Restaurant'}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <DateIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(order.createdAt)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
                    <Chip 
                      label={order.status} 
                      color={getStatusColor(order.status)}
                      size="small"
                      sx={{ fontWeight: 800, borderRadius: 1.5 }}
                    />
                    <Typography variant="subtitle1" fontWeight={900} sx={{ mt: 1 }}>
                      {formatCurrency(order.totals?.total || order.total)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {order.items?.map(item => `${item.quantity} × ${item.name}`).join(', ').slice(0, 100)}
                      {order.items?.length > 3 ? '...' : ''}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Button 
                        variant="contained" 
                        size="small"
                        startIcon={<ReorderIcon />}
                        onClick={() => handleReorder(order)}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                      >
                        Reorder
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => navigate(`/orders/${order._id || order.id}`)}
                        startIcon={<InfoIcon />}
                        sx={{ borderRadius: 2, fontWeight: 700 }}
                      >
                        Details
                      </Button>
                      {order.status === 'DELIVERED' && !order.reviewed && (
                        <Button 
                          variant="text" 
                          size="small"
                          startIcon={<ReviewIcon />}
                          sx={{ borderRadius: 2, fontWeight: 700 }}
                        >
                          Write Review
                        </Button>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            ))
          )}
        </Stack>

        <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
          <Pagination 
            count={5} 
            page={page} 
            onChange={(_, val) => setPage(val)} 
            color="primary" 
          />
        </Box>
      </Container>
    </Box>
  );
};

export default OrdersPage;
