// src/pages/OrderConfirmationPage.jsx
import React from 'react';
import { 
  Box, Container, Typography, Button, Paper, 
  Stack, Grid, alpha, useTheme 
} from '@mui/material';
import { 
  CheckCircle as SuccessIcon,
  Timeline as TrackIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatters';

const OrderConfirmationPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { id } = useParams();
  
  const order = state?.order || {
    id: id || 'ORD12345678',
    total: 1250,
    restaurantName: 'The Pizza Co.',
    estimatedDelivery: '35-45 mins',
    address: '123 Maple Avenue, San Francisco'
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 8 }}>
      <Container maxWidth="sm">
        <Paper 
          elevation={0} 
          sx={{ 
            p: 5, 
            textAlign: 'center', 
            borderRadius: 5, 
            border: '1px solid', 
            borderColor: 'divider',
            boxShadow: '0 10px 40px rgba(0,0,0,0.04)'
          }}
        >
          <Box sx={{ mb: 3 }}>
            <SuccessIcon 
              sx={{ 
                fontSize: 100, 
                color: 'success.main',
                filter: 'drop-shadow(0 4px 10px rgba(76, 175, 80, 0.3))',
                animation: 'pulse 2s infinite ease-in-out',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)', opacity: 1 },
                  '50%': { transform: 'scale(1.1)', opacity: 0.8 },
                  '100%': { transform: 'scale(1)', opacity: 1 }
                }
              }} 
            />
          </Box>

          <Typography variant="h3" fontWeight={900} gutterBottom>
            Order Confirmed!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Your delicious meal is being prepared. We've sent the receipt to your email.
          </Typography>

          <Box sx={{ mb: 4, p: 3, bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: 4, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.1) }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 1.5, display: 'block', mb: 1 }}>
              ORDER NUMBER
            </Typography>
            <Typography variant="h5" fontWeight={900} color="primary">
              #{order.id?.toString().slice(-8).toUpperCase()}
            </Typography>
          </Box>

          <Stack spacing={3} sx={{ textAlign: 'left', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Estimated Delivery</Typography>
              <Typography variant="body2" fontWeight={800}>{order.estimatedDelivery || '35-45 mins'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Restaurant</Typography>
              <Typography variant="body2" fontWeight={800}>{order.restaurantName}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Total Paid</Typography>
              <Typography variant="body2" fontWeight={800} color="primary">{formatCurrency(order.total)}</Typography>
            </Box>
          </Stack>

          <Stack spacing={2}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              startIcon={<TrackIcon />}
              onClick={() => navigate(`/orders/${order.id}`)}
              sx={{ py: 1.8, borderRadius: 3, fontWeight: 800 }}
            >
              Track Your Order
            </Button>
            <Button
              variant="outlined"
              fullWidth
              size="large"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              sx={{ py: 1.8, borderRadius: 3, fontWeight: 700 }}
            >
              Back to Home
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
};

export default OrderConfirmationPage;
