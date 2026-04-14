// src/redux/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService } from '@/services/authService';
import { tokenStorage } from '@/utils/tokenStorage';

// ── Async Thunks ─────────────────────────────────────────────────────────────

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { dispatch, rejectWithValue }) => {
    dispatch(loginStart());
    try {
      const response = await authService.login(credentials);
      const { user, token } = response.data.data || response.data; // Handle different API response structures
      tokenStorage.set(token);
      dispatch(loginSuccess({ user, token }));
      return { user, token };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      dispatch(loginFailure(message));
      return rejectWithValue(message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { dispatch, rejectWithValue }) => {
    dispatch(loginStart()); // Use loginStart for loading state
    try {
      const response = await authService.register(userData);
      const { user, token } = response.data.data || response.data;
      tokenStorage.set(token);
      dispatch(loginSuccess({ user, token }));
      return { user, token };
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      const detailErrors = err.response?.data?.errors;
      dispatch(loginFailure({ message, errors: detailErrors }));
      return rejectWithValue(detailErrors || message);
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { dispatch, rejectWithValue }) => {
    dispatch(loginStart());
    try {
      const response = await authService.getProfile();
      const user = response.data.data || response.data;
      dispatch(loginSuccess({ user, token: tokenStorage.get() }));
      return user;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to fetch profile';
      dispatch(loginFailure(message));
      return rejectWithValue(message);
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: tokenStorage.get(),
    isAuthenticated: !!tokenStorage.get(),
    loading: false,
    error: null,
  },
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      state.detailErrors = null;
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload.message || action.payload;
      state.detailErrors = action.payload.errors || null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.detailErrors = null;
      tokenStorage.clear();
    },
    updateProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    }
  },
});

export const { 
  loginStart, 
  loginSuccess, 
  loginFailure, 
  logout, 
  updateProfile,
  clearError 
} = authSlice.actions;

// Selectors
export const selectUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthToken = (state) => state.auth.token;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthDetailErrors = (state) => state.auth.detailErrors;

export default authSlice.reducer;
