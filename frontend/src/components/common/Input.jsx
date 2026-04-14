import React from 'react';
import { TextField, InputAdornment } from '@mui/material';

/**
 * Custom Input Component
 * @param {Object} props - MUI TextField props
 * @param {React.ReactNode} props.icon - Suffix/Prefix icon
 * @param {string} props.iconPosition - 'start' | 'end'
 */
const Input = ({ 
  label, 
  error = false, 
  helperText, 
  icon, 
  iconPosition = 'start',
  fullWidth = true,
  ...props 
}) => {
  return (
    <TextField
      label={label}
      error={error}
      helperText={helperText}
      fullWidth={fullWidth}
      slotProps={{
        input: {
          [iconPosition === 'start' ? 'startAdornment' : 'endAdornment']: icon ? (
            <InputAdornment position={iconPosition}>
              {icon}
            </InputAdornment>
          ) : null,
        },
      }}
      {...props}
    />
  );
};

export default Input;
