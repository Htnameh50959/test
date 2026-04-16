import { useEffect, useState } from 'react';
import { useFormik } from 'formik';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, ArrowBack } from '@mui/icons-material';

import { useAuth } from '@/hooks/useAuth';
import { loginSchema } from '@/utils';

export default function LoginPage() {
  const { login, isAuthenticated, user, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';
  
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      // If we have a specific 'from' location, go there.
      // Otherwise, redirect based on user role.
      if (from !== '/') {
        navigate(from, { replace: true });
      } else {
        if (user.role === 'merchant') {
          navigate('/merchant', { replace: true });
        } else if (user.role === 'admin') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, navigate, from]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const sessionExpired = new URLSearchParams(location.search).get('session') === 'expired';

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: loginSchema,
    onSubmit: async (values) => {
      // In a real app, 'rememberMe' would affect token expiration or storage
      await login(values);
    },
  });

  return (
    <Box sx={{ width: '100%', maxWidth: 480, mx: 'auto', py: 4 }}>
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
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to continue your culinary journey
          </Typography>
        </Box>

        {sessionExpired && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            Your session has expired. Please sign in again.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={formik.handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            placeholder="example@mail.com"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            autoComplete="email"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Email fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Password"
            name="password"
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            autoComplete="current-password"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton edge="end" onClick={() => setShowPw((p) => !p)}>
                      {showPw ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  color="primary"
                />
              }
              label={<Typography variant="body2">Remember me</Typography>}
            />
            <Link
              to="/forgot-password"
              style={{
                fontSize: '0.875rem',
                color: '#E63946',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Forgot password?
            </Link>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !formik.isValid}
            sx={{
              py: 1.8,
              fontSize: '1.1rem',
              borderRadius: 3,
              boxShadow: '0 8px 16px rgba(230,57,70,0.2)',
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>

        <Divider sx={{ my: 4 }}>
          <Typography variant="body2" color="text.secondary">
            New to FoodieHub?
          </Typography>
        </Divider>

        <Button
          component={Link}
          to="/register"
          fullWidth
          variant="outlined"
          size="large"
          sx={{ py: 1.5, borderRadius: 3, borderWidth: 2, '&:hover': { borderWidth: 2 } }}
        >
          Create Account
        </Button>
      </Paper>
    </Box>
  );
}
