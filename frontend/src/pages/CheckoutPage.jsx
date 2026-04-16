// src/pages/CheckoutPage.jsx
import React, { useEffect } from 'react';
import {
  Box, Container, Grid, Stepper, Step, StepLabel,
  Typography, useTheme, useMediaQuery, Paper
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectActiveStep } from '@/redux/slices/checkoutSlice';
import AddressStep from '@/components/checkout/AddressStep';
import PaymentStep from '@/components/checkout/PaymentStep';
import ReviewStep from '@/components/checkout/ReviewStep';
import CheckoutSummary from '@/components/checkout/CheckoutSummary';

const steps = ['Delivery Address', 'Payment Method', 'Review & Place Order'];

const CheckoutPage = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const activeStep = useSelector(selectActiveStep);
  const cartItems = useSelector((state) => state.cart.items);

  // Redirect to home if cart is empty
  useEffect(() => {
    if (cartItems.length === 0 && activeStep === 0) {
      // navigate('/'); // Keep for dev
    }
  }, [cartItems, navigate, activeStep]);

  const renderStepContent = (step) => {
    switch (step) {
      case 0: return <AddressStep />;
      case 1: return <PaymentStep />;
      case 2: return <ReviewStep />;
      default: return null;
    }
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: { xs: 4, md: 8 } }}>
      <Container maxWidth="lg">
        <Typography variant="h4" fontWeight={900} sx={{ mb: 4, fontSize: { xs: '1.8rem', md: '2.5rem' } }}>
          Checkout
        </Typography>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 8 }}>
            {/* Stepper Header */}
            <Paper elevation={0} sx={{ p: 4, mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              <Stepper activeStep={activeStep} alternativeLabel={!isMobile} orientation={isMobile ? 'vertical' : 'horizontal'}>
                {steps.map((label, index) => (
                  <Step key={label}>
                    <StepLabel
                      StepIconProps={{
                        sx: {
                          '&.Mui-active': { color: 'primary.main', fontWeight: 700 },
                          '&.Mui-completed': { color: 'primary.main' }
                        }
                      }}
                    >
                      <Typography variant="body2" fontWeight={activeStep >= index ? 700 : 400}>
                        {label}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Paper>

            {/* Step Content */}
            <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
              {renderStepContent(activeStep)}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <CheckoutSummary />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default CheckoutPage;
