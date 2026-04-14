import React from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton, 
  Typography,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Custom Modal Component
 * @param {Object} props
 * @param {boolean} props.open - Is modal visible
 * @param {Function} props.onClose - Close callback
 * @param {string} props.title - Modal title
 * @param {React.ReactNode} props.actions - Modal footer buttons
 * @param {string} props.maxWidth - xs | sm | md | lg | xl
 */
const Modal = ({ 
  open, 
  onClose, 
  title, 
  children, 
  actions, 
  maxWidth = 'sm', 
  fullScreen = false,
  ...props 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={fullScreen || isMobile}
      PaperProps={{
        sx: { 
          borderRadius: isMobile ? 0 : 2,
          padding: 1
        }
      }}
      {...props}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
        <DialogTitle sx={{ flex: 1 }}>{title}</DialogTitle>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent dividers sx={{ borderBottom: 'none' }}>
        {children}
      </DialogContent>

      {actions && (
        <DialogActions sx={{ p: 2, pt: 0 }}>
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
};

export default Modal;
