// src/main.jsx — Application entry point

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider }   from 'react-redux';
import { RouterProvider } from 'react-router-dom';
import CssBaseline    from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';

import store  from '@/redux/store';
import router from '@/router';
import theme  from '@/theme';

import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <RouterProvider router={router} />
      </ThemeProvider>
    </Provider>
  </StrictMode>
);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered:', reg);
    }).catch(err => {
      console.log('SW registration failed:', err);
    });
  });
}
