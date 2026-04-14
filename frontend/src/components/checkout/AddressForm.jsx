// src/components/checkout/AddressForm.jsx
import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Grid, Box, Typography,
  FormControlLabel, Checkbox, IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const AddressForm = ({ open, onClose }) => {
  const formik = useFormik({
    initialState: {
      label: '',
      street: '',
      apartment: '',
      city: '',
      state: '',
      zip: '',
      deliveryInstructions: '',
      saveAddress: true,
    },
    validationSchema: Yup.object({
      label: Yup.string().required('Label is required (e.g. Home, Work)'),
      street: Yup.string().required('Street address is required'),
      city: Yup.string().required('City is required'),
      state: Yup.string().required('State is required'),
      zip: Yup.string().required('ZIP code is required').matches(/^[0-9]{5,6}$/, 'Enter a valid ZIP code'),
    }),
    onSubmit: (values) => {
      console.log('New Address:', values);
      // In a real app, dispatch an action to save the address
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
        <Typography variant="h6" fontWeight={800}>Add New Address</Typography>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3, pt: 1 }}>
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address Label (e.g. Home, Office)"
                name="label"
                value={formik.values.label}
                onChange={formik.handleChange}
                error={formik.touched.label && Boolean(formik.errors.label)}
                helperText={formik.touched.label && formik.errors.label}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                name="street"
                value={formik.values.street}
                onChange={formik.handleChange}
                error={formik.touched.street && Boolean(formik.errors.street)}
                helperText={formik.touched.street && formik.errors.street}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Apartment, Suite, Unit (Optional)"
                name="apartment"
                value={formik.values.apartment}
                onChange={formik.handleChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formik.values.city}
                onChange={formik.handleChange}
                error={formik.touched.city && Boolean(formik.errors.city)}
                helperText={formik.touched.city && formik.errors.city}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formik.values.state}
                onChange={formik.handleChange}
                error={formik.touched.state && Boolean(formik.errors.state)}
                helperText={formik.touched.state && formik.errors.state}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                label="ZIP Code"
                name="zip"
                value={formik.values.zip}
                onChange={formik.handleChange}
                error={formik.touched.zip && Boolean(formik.errors.zip)}
                helperText={formik.touched.zip && formik.errors.zip}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Delivery Instructions"
                name="deliveryInstructions"
                multiline
                rows={2}
                value={formik.values.deliveryInstructions}
                onChange={formik.handleChange}
                placeholder="e.g. Gate code, drop at front desk"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox 
                    name="saveAddress"
                    checked={formik.values.saveAddress}
                    onChange={formik.handleChange}
                    color="primary"
                  />
                }
                label="Save this address for future orders"
              />
            </Grid>
          </Grid>
        </form>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button onClick={onClose} variant="text" sx={{ fontWeight: 700 }}>Cancel</Button>
        <Button 
          onClick={formik.handleSubmit} 
          variant="contained" 
          sx={{ borderRadius: 2, px: 4, py: 1, fontWeight: 700 }}
        >
          Save Address
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddressForm;
