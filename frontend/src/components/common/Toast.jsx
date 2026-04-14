import React from 'react';
import { Snackbar, Alert, Box } from '@mui/material';

/**
 * Custom Toast Notification Component
 * @param {Object} props
 * @param {boolean} props.open - Is toast visible
 * @param {Function} props.onClose - Close callback
 * @param {string} props.message - Text to show
 * @param {string} props.severity - success | error | info | warning
 */
const Toast = ({ 
  open, 
  onClose, 
  message, 
  severity = 'success', 
  duration = 3000 
}) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert 
        onClose={onClose} 
        severity={severity} 
        variant="filled"
        sx={{ width: '100%', boxShadow: 3 }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Toast;
