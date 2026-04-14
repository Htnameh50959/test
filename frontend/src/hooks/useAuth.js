import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';

import {
  selectUser, selectIsAuthenticated, selectAuthLoading, selectAuthError, selectAuthDetailErrors,
  loginUser, registerUser, logout, clearError, fetchProfile, updateProfile,
} from '@/redux/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  return {
    user:            useSelector(selectUser),
    isAuthenticated: useSelector(selectIsAuthenticated),
    loading:         useSelector(selectAuthLoading),
    error:           useSelector(selectAuthError),
    detailErrors:    useSelector(selectAuthDetailErrors),
    login:       useCallback((creds)  => dispatch(loginUser(creds)),     [dispatch]),
    register:    useCallback((data)   => dispatch(registerUser(data)),   [dispatch]),
    logout:      useCallback(()       => dispatch(logout()),             [dispatch]),
    getProfile:  useCallback(()       => dispatch(fetchProfile()),       [dispatch]),
    updateProfile: useCallback((d)    => dispatch(updateProfile(d)),     [dispatch]),
    clearError:  useCallback(()       => dispatch(clearError()),         [dispatch]),
  };
};
