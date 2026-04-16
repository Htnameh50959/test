// src/components/checkout/PaymentStep.jsx
import React from 'react';
import {
  Box,
  Button,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Slider,
  Stack,
  Step,
  Switch,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  CreditCard as CardIcon,
  AccountBalanceWallet as WalletIcon,
  Apple as AppleIcon,
  Payment as PayPalIcon,
  Stars as StarsIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { 
  selectPayment, toggleLoyalty, setLoyaltyPoints, 
  prevStep, nextStep, updateCardDetails 
} from '@/redux/slices/checkoutSlice';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const PaymentStep = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const checkout = useSelector((state) => state.checkout);
  const { selectedPayment, isLoyaltyUsed, loyaltyPointsApplied, cardDetails } = checkout;

  // Mock loyalty points
  const availablePoints = 1500; 

  const handlePaymentChange = (event) => {
    dispatch(selectPayment(event.target.value));
  };

  const formik = useFormik({
    initialValues: cardDetails,
    validationSchema: Yup.object({
      cardNumber: Yup.string().required('Required').matches(/^[0-9 ]{16,19}$/, 'Invalid card'),
      cardholderName: Yup.string().required('Required'),
      expiryDate: Yup.string().required('Required').matches(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, 'Format MM/YY'),
      cvv: Yup.string().required('Required').matches(/^[0-9]{3,4}$/, '3-4 digits'),
    }),
    onSubmit: (values) => {
      dispatch(updateCardDetails(values));
      dispatch(nextStep());
    },
  });

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        Select Payment Method
      </Typography>

      <RadioGroup value={selectedPayment} onChange={handlePaymentChange}>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {[
            { id: 'credit_card', label: 'Credit/Debit Card', icon: <CardIcon /> },
            { id: 'paypal', label: 'PayPal', icon: <PayPalIcon /> },
            { id: 'apple_pay', label: 'Apple Pay', icon: <AppleIcon /> },
          ].map((method) => (
            <Grid size={{ xs: 12 }} key={method.id}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  border: '2px solid',
                  borderColor: selectedPayment === method.id ? 'primary.main' : 'divider',
                  borderRadius: 3,
                  bgcolor: selectedPayment === method.id ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                  transition: 'all 0.2s',
                }}
              >
                <FormControlLabel
                  value={method.id}
                  control={<Radio />}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                      {React.cloneElement(method.icon, { sx: { mr: 1, color: 'text.secondary' } })}
                      <Typography variant="subtitle1" fontWeight={700}>{method.label}</Typography>
                    </Box>
                  }
                  sx={{ width: '100%', m: 0 }}
                />

                {selectedPayment === 'credit_card' && method.id === 'credit_card' && (
                  <Box sx={{ mt: 3, px: 2, pb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Card Number"
                          name="cardNumber"
                          value={formik.values.cardNumber}
                          onChange={formik.handleChange}
                          error={formik.touched.cardNumber && Boolean(formik.errors.cardNumber)}
                          helperText={formik.touched.cardNumber && formik.errors.cardNumber}
                          slotProps={{ input: { endAdornment: <CardIcon color="action" /> } }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          label="Cardholder Name"
                          name="cardholderName"
                          value={formik.values.cardholderName}
                          onChange={formik.handleChange}
                          error={formik.touched.cardholderName && Boolean(formik.errors.cardholderName)}
                          helperText={formik.touched.cardholderName && formik.errors.cardholderName}
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth
                          label="Expiry Date (MM/YY)"
                          name="expiryDate"
                          value={formik.values.expiryDate}
                          onChange={formik.handleChange}
                          error={formik.touched.expiryDate && Boolean(formik.errors.expiryDate)}
                          helperText={formik.touched.expiryDate && formik.errors.expiryDate}
                        />
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <TextField
                          fullWidth
                          label="CVV"
                          name="cvv"
                          type="password"
                          value={formik.values.cvv}
                          onChange={formik.handleChange}
                          error={formik.touched.cvv && Boolean(formik.errors.cvv)}
                          helperText={formik.touched.cvv && formik.errors.cvv}
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>
      </RadioGroup>

      <Divider sx={{ my: 4 }} />

      {/* Loyalty Points Section */}
      <Paper elevation={0} sx={{ p: 3, bgcolor: '#fdf8f3', borderRadius: 3, border: '1px solid #fee2cc' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <StarsIcon color="warning" sx={{ mr: 1.5 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={800}>Redeem Loyalty Points</Typography>
              <Typography variant="body2" color="text.secondary">
                You have {availablePoints} points available
              </Typography>
            </Box>
          </Box>
          <Switch
            checked={isLoyaltyUsed}
            onChange={(e) => dispatch(toggleLoyalty(e.target.checked))}
            color="warning"
          />
        </Box>

        {isLoyaltyUsed && (
          <Box sx={{ mt: 3, px: 2 }}>
            <Typography variant="body2" fontWeight={700} gutterBottom>
              Select points to use: {loyaltyPointsApplied} pts (Value: ₹{loyaltyPointsApplied / 4})
            </Typography>
            <Slider
              value={loyaltyPointsApplied}
              min={0}
              max={availablePoints}
              step={10}
              onChange={(_, val) => dispatch(setLoyaltyPoints(val))}
              valueLabelDisplay="auto"
              color="warning"
            />
            <Typography variant="caption" color="text.secondary">
              Note: 100 points = ₹25 discount
            </Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={() => dispatch(prevStep())} sx={{ fontWeight: 700 }}>
          Back to Address
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={selectedPayment === 'credit_card' ? formik.handleSubmit : () => dispatch(nextStep())}
          sx={{ px: 6, py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          Continue to Review
        </Button>
      </Box>
    </Box>
  );
};

export default PaymentStep;
