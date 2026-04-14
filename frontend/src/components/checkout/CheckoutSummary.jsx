// src/components/checkout/CheckoutSummary.jsx
import React from 'react';
import { Box, Typography, Paper, Divider, Stack, alpha, useTheme } from '@mui/material';
import { useSelector } from 'react-redux';
import { formatCurrency } from '@/utils/formatters';

const CheckoutSummary = () => {
  const theme = useTheme();
  const { cart, checkout } = useSelector((state) => state);
  const { totals, items, restaurantName } = cart;
  const { loyaltyPointsApplied } = checkout;

  const discountValue = loyaltyPointsApplied / 4; // ₹1 = 100 points -> ₹0.25 = 1 point

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        border: '1px solid', 
        borderColor: 'divider', 
        borderRadius: 4,
        position: 'sticky',
        top: 100
      }}
    >
      <Typography variant="h6" fontWeight={800} gutterBottom>
        Order Summary
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        From {restaurantName}
      </Typography>

      <Stack spacing={2} sx={{ mb: 3 }}>
        {items.map((item) => (
          <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              {item.quantity} × {item.name}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatCurrency(item.price * item.quantity)}
            </Typography>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ mb: 3 }} />

      <Stack spacing={1.5}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Subtotal</Typography>
          <Typography variant="body2" fontWeight={600}>{formatCurrency(totals.subtotal)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Delivery Fee</Typography>
          <Typography variant="body2" fontWeight={600}>{formatCurrency(totals.deliveryFee)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Service Fee (5%)</Typography>
          <Typography variant="body2" fontWeight={600}>{formatCurrency(totals.serviceFee)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Tax (8%)</Typography>
          <Typography variant="body2" fontWeight={600}>{formatCurrency(totals.tax)}</Typography>
        </Box>
        
        {loyaltyPointsApplied > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>Loyalty Discount</Typography>
            <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 700 }}>
              - {formatCurrency(discountValue)}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={800}>Total</Typography>
          <Typography variant="h6" fontWeight={900} color="primary">
            {formatCurrency(Math.max(0, totals.total - discountValue))}
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ mt: 3, p: 2, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 3, border: '1px dashed', borderColor: 'success.light' }}>
        <Typography variant="caption" color="success.dark" fontWeight={700} sx={{ display: 'block', textAlign: 'center' }}>
          You will earn {Math.floor(totals.subtotal / 10)} loyalty points on this order!
        </Typography>
      </Box>
    </Paper>
  );
};

export default CheckoutSummary;
