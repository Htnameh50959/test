// src/redux/slices/uiSlice.js
import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    toasts: [], // Array of { id, message, severity, duration }
    isSidebarOpen: false,
    themeMode: 'light',
  },
  reducers: {
    addToast: (state, action) => {
      const { message, severity = 'info', duration = 3000 } = action.payload;
      state.toasts.push({
        id: Date.now(),
        message,
        severity,
        duration,
      });
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setThemeMode: (state, action) => {
      state.themeMode = action.payload;
    },
  },
});

export const { addToast, removeToast, toggleSidebar, setThemeMode } = uiSlice.actions;

export const selectToasts = (state) => state.ui.toasts;

export default uiSlice.reducer;
