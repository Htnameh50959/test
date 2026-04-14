import React from 'react';
import { Button as MuiButton, CircularProgress } from '@mui/material';

/**
 * Custom Button Component
 * @param {Object} props - MUI Button props + extra
 * @param {boolean} props.loading - Shows a spinner if true
 * @param {string} props.variant - primary | secondary | outlined | text
 */
const Button = ({ 
  children, 
  loading = false, 
  variant = 'primary', 
  color = 'primary',
  disabled = false,
  ...props 
}) => {
  // Map our custom 'primary'/'secondary' variants to MUI variants
  const getMuiVariant = (v) => {
    if (v === 'outlined') return 'outlined';
    if (v === 'text') return 'text';
    return 'contained';
  };

  const getMuiColor = (v) => {
    if (v === 'secondary') return 'secondary';
    return 'primary';
  };

  return (
    <MuiButton
      variant={getMuiVariant(variant)}
      color={getMuiColor(variant === 'primary' || variant === 'secondary' ? variant : color)}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : props.startIcon}
      {...props}
    >
      {loading ? (props.loadingText || 'Loading...') : children}
    </MuiButton>
  );
};

export default Button;
