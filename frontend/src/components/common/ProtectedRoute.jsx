// src/components/common/ProtectedRoute.jsx
// Redirects unauthenticated users to /login, preserving the intended destination.

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';

import { selectIsAuthenticated, selectAuthLoading, selectUser } from '@/redux/slices/authSlice';

export default function ProtectedRoute({ allowedRoles }) {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectAuthLoading);
  const user = useSelector(selectUser);
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress color="primary" />
      </Box>
    );

  }

  if (!isAuthenticated) {
    // Redirect to login, but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified, check if the user has the required permission
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // If user is authenticated but doesn't have the right role, 
    // redirect to home (or could be a 403 Forbidden page)
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
