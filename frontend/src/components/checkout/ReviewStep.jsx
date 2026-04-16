// src/components/checkout/ReviewStep.jsx
import React, { useState } from 'react';
import {
  Box, Typography, Button, Paper, Stack, Divider,
  TextField, FormControlLabel, Checkbox, alpha,
  useTheme, Grid, Avatar, CircularProgress
} from '@mui/material';
import {
  Place as PlaceIcon,
  Payment as PaymentIcon,
  Restaurant as RestaurantIcon,
  ChevronLeft as BackIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { prevStep, resetCheckout } from '@/redux/slices/checkoutSlice';
import { placeOrder } from '@/redux/slices/ordersSlice';
import { clearCart } from '@/redux/slices/cartSlice';
import { formatCurrency } from '@/utils/formatters';
import PaymentFailureModal from './PaymentFailureModal';

const ReviewStep = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { cart, checkout, orders } = useSelector((state) => state);
  const { selectedAddress, selectedPayment, loyaltyPointsApplied, isTCAccepted, specialInstructions } = checkout;
  const { totals, items, restaurantName } = cart;
  
  const [instructions, setInstructions] = useState(specialInstructions);
  const [agreed, setAgreed] = useState(isTCAccepted);
  const [loading, setLoading] = useState(false);
  const [failureModalOpen, setFailureModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePlaceOrder = async () => {
    if (!agreed) return;
    setLoading(true);
    
    const orderData = {
      restaurantId: cart.restaurantId,
      items: items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        modifiers: item.modifiers,
        price: item.price
      })),
      deliveryAddress: selectedAddress,
      paymentMethod: selectedPayment,
      specialInstructions: instructions,
      loyaltyPointsUsed: loyaltyPointsApplied
    };

    try {
      const result = await dispatch(placeOrder(orderData)).unwrap();
      dispatch(clearCart());
      dispatch(resetCheckout());
      navigate(`/orders/${result._id || result.id}/success`, { state: { order: result } });
    } catch (error) {
      console.error('Order Failed:', error);
      setErrorMessage(error || 'Payment failed. Please try again.');
      setFailureModalOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        Review Your Order
      </Typography>

      <Stack spacing={3} sx={{ mt: 2 }}>
        {/* Delivery & Payment Summary */}
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary">DELIVERY ADDRESS</Typography>
                <Button size="small" onClick={() => dispatch(prevStep())}>Change</Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <PlaceIcon color="primary" sx={{ mt: 0.2 }} />
                <Box>
                  <Typography variant="body1" fontWeight={700}>{selectedAddress?.label}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedAddress?.street}, {selectedAddress?.city}, {selectedAddress?.zip}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={800} color="text.secondary">PAYMENT METHOD</Typography>
                <Button size="small" onClick={() => dispatch(prevStep())}>Change</Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <PaymentIcon color="primary" sx={{ mt: 0.2 }} />
                <Box>
                  <Typography variant="body1" fontWeight={700}>
                    {selectedPayment === 'credit_card' ? 'Credit/Debit Card' : 
                     selectedPayment === 'paypal' ? 'PayPal' : 'Apple Pay'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedPayment === 'credit_card' ? 'Ending in **** 1234' : 'Secured Payment'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Items List */}
        <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <RestaurantIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={800}>{restaurantName}</Typography>
          </Box>
          <Stack divider={<Divider />} spacing={1.5}>
            {items.map((item) => (
              <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" fontWeight={700}>{item.name} × {item.quantity}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {item.modifiers?.map(m => m.name).join(', ')}
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={700}>{formatCurrency(item.price * item.quantity)}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>

        {/* Special Instructions */}
        <TextField
          fullWidth
          label="Special Instructions for the Restaurant / Delivery Agent"
          multiline
          rows={2}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Please ring the bell, keep it spicy!"
          variant="outlined"
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
        />

        {/* T&C */}
        <FormControlLabel
          control={
            <Checkbox 
              checked={agreed} 
              onChange={(e) => setAgreed(e.target.checked)} 
              color="primary"
            />
          }
          label={
            <Typography variant="body2">
              I agree to the <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer', fontWeight: 600 }}>Terms and Conditions</Typography> and <Typography component="span" variant="body2" color="primary" sx={{ cursor: 'pointer', fontWeight: 600 }}>Privacy Policy</Typography>.
            </Typography>
          }
        />

        {/* Final CTA */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Button 
            startIcon={<BackIcon />} 
            onClick={() => dispatch(prevStep())} 
            sx={{ fontWeight: 700 }}
          >
            Payment
          </Button>
          <Button
            variant="contained"
            size="large"
            disabled={!agreed || loading}
            onClick={handlePlaceOrder}
            sx={{ 
              px: 6, 
              py: 2, 
              borderRadius: 3, 
              fontWeight: 800,
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
              boxShadow: '0 8px 25px rgba(255, 107, 107, 0.4)',
              minWidth: 280
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : `Place Order · ${formatCurrency(totals.total)}`}
          </Button>
        </Box>
      </Stack>

      <PaymentFailureModal 
        open={failureModalOpen} 
        onClose={() => setFailureModalOpen(false)} 
        errorMsg={errorMessage}
      />
    </Box>
  );
};

export default ReviewStep;
