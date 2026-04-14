// src/components/checkout/PaymentFailureModal.jsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, alpha, useTheme
} from '@mui/material';
import { ErrorOutline as ErrorIcon, Payment as PaymentIcon, Refresh as RetryIcon } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { setStep } from '@/redux/slices/checkoutSlice';

const PaymentFailureModal = ({ open, onClose, errorMsg }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const handleChangePayment = () => {
    dispatch(setStep(1)); // Go back to payment step
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth 
      PaperProps={{ sx: { borderRadius: 4, p: 2 } }}
    >
      <DialogContent sx={{ textAlign: 'center', pb: 0 }}>
        <Box sx={{ 
          width: 80, 
          height: 80, 
          borderRadius: '50%', 
          bgcolor: alpha(theme.palette.error.main, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 3
        }}>
          <ErrorIcon color="error" sx={{ fontSize: 50 }} />
        </Box>

        <Typography variant="h5" fontWeight={900} gutterBottom>
          Payment Failed
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          {errorMsg || "We couldn't process your payment. Please check your card details or try a different payment method."}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ flexDirection: 'column', gap: 1.5, p: 3 }}>
        <Button
          fullWidth
          variant="contained"
          color="error"
          startIcon={<RetryIcon />}
          onClick={onClose}
          sx={{ py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          Try Again
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<PaymentIcon />}
          onClick={handleChangePayment}
          sx={{ py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          Change Payment Method
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentFailureModal;
