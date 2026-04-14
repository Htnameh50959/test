// src/services/api.js
// Configured Axios instance — every service file imports this, not bare axios.

import axios from 'axios';

import { tokenStorage } from '@/utils/tokenStorage';

// Lazily import store to avoid circular: api → store → slices → services → api
const getStore = () => import('@/redux/store').then((m) => m.default);
const getLogout = () => import('@/redux/slices/authSlice').then((m) => m.logout);

// ── Instance ──────────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL:        import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout:        15000,   // 15 s hard timeout
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  },
});

// ── Request interceptor — attach JWT ──────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — global error handling ──────────────────────────────

api.interceptors.response.use(
  // Pass through successful responses unchanged.
  (response) => response,

  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message || error.message;

    if (status === 401 && !error.config.url.includes('/auth/login') && !error.config.url.includes('/auth/register')) {
      // Token expired — lazy-load store + logout to avoid circular import.
      Promise.all([getStore(), getLogout()]).then(([store, logout]) => {
        store.dispatch(logout());
        if (typeof window !== 'undefined') {
          window.location.href = '/login?session=expired';
        }
      });
    }

    if (status === 429) {
      // Rate limited — surface a human-readable message.
      error.displayMessage = 'Too many requests. Please wait a moment and try again.';
    }

    if (status >= 500) {
      error.displayMessage = 'Server error. Please try again later.';
    }

    console.error(`[API Error] ${status} ${message}`);
    return Promise.reject(error);
  }
);

export default api;
