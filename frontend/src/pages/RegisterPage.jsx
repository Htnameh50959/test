import { useEffect, useState, useMemo } from 'react';
import { useFormik } from 'formik';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Person, Email, Phone, Lock, Security, ArrowBack } from '@mui/icons-material';

import { useAuth } from '@/hooks/useAuth';
import { registerSchema } from '@/utils';

export default function RegisterPage() {
  const { register: registerUser, isAuthenticated, user, loading, error, clearError } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'merchant') {
        navigate('/merchant', { replace: true });
      } else if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const [emailStatus, setEmailStatus] = useState({ checking: false, exists: false, message: '' });

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const formik = useFormik({
    initialValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      terms: false
    },
    validationSchema: registerSchema,
    onSubmit: async (values) => {
      // Logic to split full name for the backend
      const nameParts = values.fullName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const payload = {
        firstName,
        lastName,
        email: values.email,
        phone: values.phone,
        password: values.password
      };
      
      await registerUser(payload);
    },
  });

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

  // Password strength logic
  const passwordStrength = useMemo(() => {
    const pw = formik.values.password;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score += 25;
    if (/[0-9]/.test(pw)) score += 25;
    if (/[A-Z]/.test(pw)) score += 25;
    if (/[!@#$%^&*(),.?":{}|<> ]/.test(pw)) score += 25;
    return score;
  }, [formik.values.password]);

  const getStrengthColor = (score) => {
    if (score <= 25) return 'error';
    if (score <= 50) return 'warning';
    if (score <= 75) return 'info';
    return 'success';
  };

  const getStrengthLabel = (score) => {
    if (score === 0) return '';
    if (score <= 25) return 'Weak';
    if (score <= 50) return 'Fair';
    if (score <= 75) return 'Good';
    return 'Strong';
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 560, mx: 'auto', py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <IconButton 
          onClick={() => navigate(-1)} 
          sx={{ 
            bgcolor: 'white', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', 
            border: '1px solid rgba(0,0,0,0.05)',
            '&:hover': { bgcolor: '#f5f5f5' } 
          }}
        >
          <ArrowBack fontSize="small" />
        </IconButton>
      </Box>
      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 4, md: 7 }, 
          borderRadius: 6, 
          border: '1px solid rgba(0,0,0,0.06)', 
          bgcolor: 'white',
          boxShadow: '0 20px 60px rgba(45, 41, 38, 0.03)'
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" fontWeight={800} color="primary" sx={{ mb: 1, letterSpacing: '-0.02em' }}>
            Join FoodieHub
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create an account to explore the best flavours
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={formik.handleSubmit} noValidate>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Full Name"
                name="fullName"
                placeholder="John Doe"
                value={formik.values.fullName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.fullName && Boolean(formik.errors.fullName)}
                helperText={formik.touched.fullName && formik.errors.fullName}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                placeholder="john@example.com"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={emailStatus.exists || (formik.touched.email && Boolean(formik.errors.email))}
                helperText={emailStatus.message || (formik.touched.email && formik.errors.email)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: emailStatus.checking && (
                      <InputAdornment position="end">
                        <CircularProgress size={20} />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Phone fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }
                }}
              />
              {formik.values.password && (
                <Box sx={{ mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Strength: <strong>{getStrengthLabel(passwordStrength)}</strong>
                    </Typography>
                    <Security sx={{ fontSize: 14, color: 'text.secondary' }} />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength}
                    color={getStrengthColor(passwordStrength)}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              )}
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  }
                }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="terms"
                    size="small"
                    checked={formik.values.terms}
                    onChange={formik.handleChange}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    I agree to the <Link style={{ color: '#E63946', fontWeight: 600 }}>Terms & Conditions</Link>
                  </Typography>
                }
              />
              {formik.touched.terms && formik.errors.terms && (
                <Typography variant="caption" color="error" display="block" sx={{ mt: 0.5 }}>
                  {formik.errors.terms}
                </Typography>
              )}
            </Grid>
          </Grid>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !formik.isValid || emailStatus.exists}
            sx={{
              mt: 4,
              py: 1.8,
              fontSize: '1.1rem',
              borderRadius: 3,
              boxShadow: '0 8px 16px rgba(230,57,70,0.2)',
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Account'}
          </Button>
        </Box>

        <Divider sx={{ my: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?
          </Typography>
        </Divider>

        <Button
          component={Link}
          to="/login"
          fullWidth
          variant="outlined"
          size="large"
          sx={{ py: 1.5, borderRadius: 3, mb: 3 }}
        >
          Sign In
        </Button>

        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: '#FBF9F6', border: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
           <Typography variant="subtitle2" fontWeight={900} sx={{ mb: 1 }}>ARE YOU A RESTAURANT OWNER?</Typography>
           <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Partner with us to reach thousands of gourmets in your city.
           </Typography>
           <Button 
              component={Link} 
              to="/merchant/register" 
              variant="text" 
              color="primary" 
              sx={{ fontWeight: 900, borderRadius: 2 }}
           >
              BECOME A KINETIC PARTNER →
           </Button>
        </Paper>
      </Paper>
    </Box>
  );
}
