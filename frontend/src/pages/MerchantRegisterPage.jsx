import { useState, useMemo, useEffect } from 'react';
import { useFormik } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, Typography, Divider,
  Alert, Grid, InputAdornment, CircularProgress,
  FormControlLabel, Checkbox, Container, Paper,
  IconButton, Stepper, Step, StepLabel, Stack
} from '@mui/material';
import { Store, Email, Phone, Lock, Person, Business, LocationOn, ArrowBack, MyLocation } from '@mui/icons-material';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import * as Yup from 'yup';

// Leaflet Icon Fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const DEFAULT_CENTER = { lat: 17.3850, lng: 78.4867 }; // Hyderabad

const validationSchema = Yup.object({
  fullName: Yup.string().required('Legal Name is required'),
  email: Yup.string().email('Invalid email').required('Email is required'),
  phone: Yup.string().required('Phone is required'),
  businessName: Yup.string().required('Restaurant Name is required'),
  address: Yup.string().required('Business Address is required'),
  lat: Yup.number().required('Map coordinates are required'),
  lng: Yup.number().required('Map coordinates are required'),
  password: Yup.string().min(8, 'Password too short').required('Password is required'),
  terms: Yup.boolean().oneOf([true], 'You must accept the terms'),
});

const STEPS = ['Personal Info', 'Brand Details', 'Precision Location', 'Security'];

// Map Click Handler
function LocationPicker({ lat, lng, onSelect }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return lat && lng ? <Marker position={[lat, lng]} /> : null;
}

export default function MerchantRegisterPage() {
  const { register: registerUser, isAuthenticated, loading, error, detailErrors, clearError } = useAuth();
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const { location: deviceLocation } = useGeolocation({ autoRequest: true });
  const [emailStatus, setEmailStatus] = useState({ checking: false, exists: false, message: '' });

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const formik = useFormik({
    initialValues: {
      fullName: '',
      email: '',
      phone: '',
      businessName: '',
      address: '',
      lat: DEFAULT_CENTER.lat, 
      lng: DEFAULT_CENTER.lng,
      password: '',
      terms: false
    },
    validationSchema,
    onSubmit: async (values) => {
      const nameParts = values.fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const payload = {
        firstName,
        lastName,
        email: values.email,
        phone: values.phone,
        password: values.password,
        role: 'merchant',
        merchantDetails: {
           businessName: values.businessName,
           address: values.address,
           location: {
              type: 'Point',
              coordinates: [values.lng, values.lat]
           }
        }
      };
      
      await registerUser(payload);
    },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/merchant/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Real-time Email Availability Check
  useEffect(() => {
    const checkEmail = async () => {
      const email = formik.values.email;
      if (!email || formik.errors.email) return;

      setEmailStatus(prev => ({ ...prev, checking: true, exists: false, message: '' }));
      try {
        const response = await fetch('/api/v1/auth/check-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        setEmailStatus({ 
          checking: false, 
          exists: data.exists, 
          message: data.exists ? 'Account already exists for this email.' : 'Email is available!' 
        });
      } catch (err) {
        setEmailStatus(prev => ({ ...prev, checking: false }));
      }
    };

    const timer = setTimeout(() => {
       if (formik.values.email) checkEmail();
    }, 800);

    return () => clearTimeout(timer);
  }, [formik.values.email, formik.errors.email]);

  // Auto-center map if device location becomes available
  useEffect(() => {
    if (activeStep === 2 && deviceLocation?.lat && formik.values.lat === DEFAULT_CENTER.lat) {
       formik.setFieldValue('lat', deviceLocation.lat);
       formik.setFieldValue('lng', deviceLocation.lng);
    }
  }, [activeStep, deviceLocation, formik]);

  const validateCurrentStep = async () => {
    // Manually trigger validation for the entire form
    const errors = await formik.validateForm();
    
    if (activeStep === 0) {
      if (emailStatus.checking) return false;
      if (emailStatus.exists || !formik.values.email || errors.email) {
        formik.setTouched({ email: true });
        return false;
      }
      if (!formik.values.fullName || !formik.values.phone || errors.fullName || errors.phone) {
        formik.setTouched({ fullName: true, phone: true });
        return false;
      }
    }
    
    if (activeStep === 1) {
      if (!formik.values.businessName || !formik.values.address || errors.businessName || errors.address) {
        formik.setTouched({ businessName: true, address: true });
        return false;
      }
    }
    
    if (activeStep === 2) {
      if (!formik.values.lat || !formik.values.lng || errors.lat || errors.lng) {
        return false;
      }
    }
    
    return true;
  };

  const nextStep = async (e) => {
     e?.preventDefault();
     const isValid = await validateCurrentStep();
     if (isValid) {
       setActiveStep((prev) => prev + 1);
     }
  };

  const prevStep = () => setActiveStep((prev) => prev - 1);

  return (
    <Box sx={{ width: '100%', maxWidth: 800, mx: 'auto', py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', '&:hover': { bgcolor: '#f5f5f5' } }}>
          <ArrowBack fontSize="small" />
        </IconButton>
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 4, md: 8 }, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white', boxShadow: '0 20px 80px rgba(0,0,0,0.04)' }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
           <Store color="primary" sx={{ fontSize: 56, mb: 2 }} />
           <Typography variant="h3" fontWeight={900}>Partner Registration</Typography>
           <Typography variant="subtitle1" color="text.secondary" fontWeight={700}>Position your restaurant on the global Kinetic map.</Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>
             <Typography variant="body2" fontWeight={700} sx={{ mb: detailErrors?.length ? 1 : 0 }}>
               {error}
             </Typography>
             {detailErrors && Array.isArray(detailErrors) && (
               <Box component="ul" sx={{ mt: 0, mb: 0, pl: 2 }}>
                 {detailErrors.map((err, i) => (
                   <Typography component="li" variant="body2" key={i}>
                     {err.message}
                   </Typography>
                 ))}
               </Box>
             )}
          </Alert>
        )}

        <Stepper activeStep={activeStep} sx={{ mb: 8, '& .MuiStepLabel-label': { fontWeight: 800 } }}>
           {STEPS.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>

        <Box component="form" onSubmit={activeStep === 3 ? formik.handleSubmit : nextStep}>
           {activeStep === 0 && (
              <Grid container spacing={4}>
                 <Grid xs={12}><TextField fullWidth label="Full Legal Name" name="fullName" value={formik.values.fullName} onChange={formik.handleChange} /></Grid>
                 <Grid xs={12} sm={6}>
                    <TextField 
                      fullWidth 
                      label="Work Email" 
                      name="email" 
                      value={formik.values.email} 
                      onChange={formik.handleChange}
                      error={emailStatus.exists || (formik.touched.email && Boolean(formik.errors.email))}
                      helperText={emailStatus.message || (formik.touched.email && formik.errors.email)}
                      slotProps={{
                        input: {
                          endAdornment: emailStatus.checking && (
                            <InputAdornment position="end">
                              <CircularProgress size={20} />
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                 </Grid>
                 <Grid xs={12} sm={6}><TextField fullWidth label="Contact Phone" name="phone" value={formik.values.phone} onChange={formik.handleChange} /></Grid>
              </Grid>
           )}

           {activeStep === 1 && (
              <Grid container spacing={4}>
                 <Grid xs={12}><TextField fullWidth label="Restaurant Name" name="businessName" value={formik.values.businessName} onChange={formik.handleChange} /></Grid>
                 <Grid xs={12}><TextField fullWidth label="Physical Address" name="address" value={formik.values.address} onChange={formik.handleChange} /></Grid>
              </Grid>
           )}

           {activeStep === 2 && (
              <Box>
                <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                   <MyLocation color="primary" /> Pin Your Strategic Location
                </Typography>
                <Paper sx={{ height: 400, borderRadius: 5, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.1)' }}>
                   <MapContainer center={[formik.values.lat, formik.values.lng]} zoom={13} style={{ height: '100%' }}>
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                      <LocationPicker 
                         lat={formik.values.lat} 
                         lng={formik.values.lng} 
                         onSelect={(lat, lng) => {
                            formik.setFieldValue('lat', lat);
                            formik.setFieldValue('lng', lng);
                         }} 
                      />
                   </MapContainer>
                </Paper>
                <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary', textAlign: 'center' }}>
                   Click on the map to place your delivery pin. Coordinates: {formik.values.lat.toFixed(6)}, {formik.values.lng.toFixed(6)}
                </Typography>
              </Box>
           )}

           {activeStep === 3 && (
              <Grid container spacing={4}>
                 <Grid xs={12}><TextField fullWidth type="password" label="Secure Password" name="password" value={formik.values.password} onChange={formik.handleChange} /></Grid>
                 <Grid xs={12}><FormControlLabel control={<Checkbox name="terms" checked={formik.values.terms} onChange={formik.handleChange} />} label={<Typography variant="caption" fontWeight={700}>Accept Service Terms</Typography>} /></Grid>
              </Grid>
           )}

           <Stack direction="row" spacing={2} sx={{ mt: 8 }}>
              {activeStep > 0 && <Button fullWidth variant="outlined" onClick={prevStep} sx={{ py: 2, borderRadius: 4, fontWeight: 900 }}>Back</Button>}
              <Button 
                fullWidth 
                type="submit" 
                variant="contained" 
                disabled={(activeStep === 0 && (emailStatus.checking || emailStatus.exists))}
                sx={{ py: 2, borderRadius: 4, fontWeight: 900, fontSize: '1.1rem' }}
              >
                 {activeStep === 3 ? (loading ? 'Launching...' : 'Activate Partner Hub') : 'Continue'}
              </Button>
           </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
