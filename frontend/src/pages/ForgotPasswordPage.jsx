import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Alert, Box, Button, CircularProgress, Divider,
  IconButton, InputAdornment, Paper, TextField, Typography,
} from '@mui/material';
import { ArrowBack, Email, ContentCopy, DoneAll } from '@mui/icons-material';
import api from '@/services/api';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [resetToken, setResetToken] = useState(null);
  const [copied, setCopied] = useState(false);

  const formik = useFormik({
    initialValues: { email: '' },
    validationSchema: Yup.object({ email: Yup.string().email('Enter a valid email').required('Email is required') }),
    onSubmit: async (values, { setSubmitting, setStatus }) => {
      try {
        const { data } = await api.post('/auth/forgot-password', { email: values.email });
        setResetToken(data.resetToken);
      } catch (err) {
        setStatus(err.response?.data?.message || 'Something went wrong. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(resetToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            Forgot Password?
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Enter your email and we'll generate a reset link for you.
          </Typography>
        </Box>

        {resetToken ? (
          <Box>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 3 }}>
              Reset token generated successfully!
            </Alert>
            <Box sx={{ bgcolor: 'grey.50', borderRadius: 3, p: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                YOUR RESET TOKEN (dev mode — would be emailed in production)
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontWeight: 600 }}>
                {resetToken}
              </Typography>
              <Button size="small" startIcon={copied ? <DoneAll /> : <ContentCopy />} onClick={handleCopy} sx={{ mt: 1, borderRadius: 2 }}>
                {copied ? 'Copied!' : 'Copy Token'}
              </Button>
            </Box>
            <Button
              fullWidth variant="contained" size="large"
              onClick={() => navigate(`/reset-password?token=${resetToken}`)}
              sx={{ borderRadius: 3, py: 1.8, fontWeight: 800 }}
            >
              Go to Reset Password
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={formik.handleSubmit} noValidate>
            {formik.status && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{formik.status}</Alert>
            )}

            <TextField
              fullWidth
              label="Email Address"
              name="email"
              type="email"
              autoComplete="email"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><Email fontSize="small" color="action" /></InputAdornment> } }}
              sx={{ mb: 4 }}
            />

            <Button type="submit" fullWidth variant="contained" size="large" disabled={formik.isSubmitting}
              sx={{ py: 1.8, fontSize: '1.05rem', borderRadius: 3, fontWeight: 800 }}>
              {formik.isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Send Reset Link'}
            </Button>
          </Box>
        )}

        <Divider sx={{ my: 4 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Remember your password?{' '}
            <Link to="/login" style={{ color: '#E63946', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}
