// src/redux/slices/checkoutSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeStep: 0,
  selectedAddress: null,
  selectedPayment: 'credit_card',
  isLoyaltyUsed: false,
  loyaltyPointsApplied: 0,
  specialInstructions: '',
  isTCAccepted: false,
  cardDetails: {
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvv: '',
    saveCard: false,
  },
  newAddressForm: {
    label: '',
    street: '',
    apartment: '',
    city: '',
    state: '',
    zip: '',
    deliveryInstructions: '',
    saveAddress: true,
  },
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setStep: (state, action) => {
      state.activeStep = action.payload;
    },
    nextStep: (state) => {
      state.activeStep += 1;
    },
    prevStep: (state) => {
      state.activeStep -= 1;
    },
    selectAddress: (state, action) => {
      state.selectedAddress = action.payload;
    },
    selectPayment: (state, action) => {
      state.selectedPayment = action.payload;
    },
    toggleLoyalty: (state, action) => {
      state.isLoyaltyUsed = action.payload;
    },
    setLoyaltyPoints: (state, action) => {
      state.loyaltyPointsApplied = action.payload;
    },
    setSpecialInstructions: (state, action) => {
      state.specialInstructions = action.payload;
    },
    setTCAccepted: (state, action) => {
      state.isTCAccepted = action.payload;
    },
    updateCardDetails: (state, action) => {
      state.cardDetails = { ...state.cardDetails, ...action.payload };
    },
    updateNewAddressForm: (state, action) => {
      state.newAddressForm = { ...state.newAddressForm, ...action.payload };
    },
    resetCheckout: () => initialState,
  },
});

export const {
  setStep,
  nextStep,
  prevStep,
  selectAddress,
  selectPayment,
  toggleLoyalty,
  setLoyaltyPoints,
  setSpecialInstructions,
  setTCAccepted,
  updateCardDetails,
  updateNewAddressForm,
  resetCheckout,
} = checkoutSlice.actions;

export const selectCheckoutState = (state) => state.checkout;
export const selectActiveStep = (state) => state.checkout.activeStep;
export const selectSelectedAddress = (state) => state.checkout.selectedAddress;
export const selectSelectedPayment = (state) => state.checkout.selectedPayment;

export default checkoutSlice.reducer;
