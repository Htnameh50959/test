import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Alert, Box, Button, CircularProgress, Divider, IconButton,
  InputAdornment, Paper, TextField, Typography,
} from '@mui/material';
import { ArrowBack, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import api from '@/services/api';
import { loginSuccess } from '@/redux/slices/authSlice';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const formik = useFormik({
    initialValues: { token: tokenFromUrl, newPassword: '', confirmPassword: '' },
    validationSchema: Yup.object({
      token: Yup.string().required('Reset token is required'),
      newPassword: Yup.string().min(8, 'Password must be at least 8 characters').required('New password is required'),
      confirmPassword: Yup.string().oneOf([Yup.ref('newPassword')], 'Passwords must match').required('Please confirm your password'),
    }),
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      try {
        const { data } = await api.post('/auth/reset-password', { token: values.token, newPassword: values.newPassword });
        if (data.token) {
          localStorage.setItem('token', data.token);
          dispatch(loginSuccess({ user: data.user, token: data.token }));
        }
        navigate('/', { replace: true });
      } catch (err) {
        setStatus(err.response?.data?.message || 'Reset failed. The token may be expired or invalid.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Box sx={{ width: '100%', maxWidth: 480, mx: 'auto', py: 4 }}>
      <Box sx={{ mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)', '&:hover': { bgcolor: '#f5f5f5' } }}>
          <ArrowBack fontSize="small" />
        </IconButton>
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white', boxShadow: '0 20px 60px rgba(45,41,38,0.03)' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ mb: 1, letterSpacing: '-0.02em' }}>
            Reset Password
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter your reset token and choose a new password.
          </Typography>
        </Box>

        <Box component="form" onSubmit={formik.handleSubmit} noValidate>
          {formik.status && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{formik.status}</Alert>
          )}

          <TextField
            fullWidth label="Reset Token" name="token" autoComplete="off"
            value={formik.values.token} onChange={formik.handleChange} onBlur={formik.handleBlur}
            error={formik.touched.token && Boolean(formik.errors.token)}
            helperText={(formik.touched.token && formik.errors.token) || 'Paste the token from the forgot password step'}
            slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: '0.85rem' } } }}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth label="New Password" name="newPassword" type={showPw ? 'text' : 'password'}
            autoComplete="new-password" placeholder="••••••••"
            value={formik.values.newPassword} onChange={formik.handleChange} onBlur={formik.handleBlur}
            error={formik.touched.newPassword && Boolean(formik.errors.newPassword)}
            helperText={formik.touched.newPassword && formik.errors.newPassword}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Lock fontSize="small" color="action" /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton edge="end" onClick={() => setShowPw(p => !p)}>{showPw ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth label="Confirm Password" name="confirmPassword" type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password" placeholder="••••••••"
            value={formik.values.confirmPassword} onChange={formik.handleChange} onBlur={formik.handleBlur}
            error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
            helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><Lock fontSize="small" color="action" /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton edge="end" onClick={() => setShowConfirm(p => !p)}>{showConfirm ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> } }}
            sx={{ mb: 4 }}
          />

          <Button type="submit" fullWidth variant="contained" size="large" disabled={formik.isSubmitting}
            sx={{ py: 1.8, fontSize: '1.05rem', borderRadius: 3, fontWeight: 800 }}>
            {formik.isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
          </Button>
        </Box>

        <Divider sx={{ my: 4 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Need a new token?{' '}
            <Link to="/forgot-password" style={{ color: '#E63946', fontWeight: 700, textDecoration: 'none' }}>Forgot Password</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
