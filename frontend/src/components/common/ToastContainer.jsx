// src/components/common/ToastContainer.jsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar, Alert, Stack, Slide } from '@mui/material';
import { selectToasts, removeToast } from '@/redux/slices/uiSlice';

function TransitionLeft(props) {
  return <Slide {...props} direction="left" />;
}

const ToastContainer = () => {
  const dispatch = useDispatch();
  const toasts = useSelector(selectToasts);

  return (
    <Stack spacing={2} sx={{ position: 'fixed', top: 24, right: 24, zIndex: 10000, width: { xs: 'calc(100% - 48px)', sm: 400 } }}>
      {toasts.map((toast) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.duration}
          onClose={() => dispatch(removeToast(toast.id))}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          TransitionComponent={TransitionLeft}
          sx={{ position: 'relative', top: 0, right: 0 }}
        >
          <Alert
            onClose={() => dispatch(removeToast(toast.id))}
            severity={toast.severity}
            variant="filled"
            elevation={6}
            sx={{ width: '100%', borderRadius: 2, fontWeight: 600, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  );
};

export default ToastContainer;
