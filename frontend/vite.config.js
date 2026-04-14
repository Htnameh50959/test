import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ── Path aliases ────────────────────────────────────────────────────────────
  // Allows: import { authSlice } from '@/redux/slices/authSlice'
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages':      resolve(__dirname, 'src/pages'),
      '@redux':      resolve(__dirname, 'src/redux'),
      '@services':   resolve(__dirname, 'src/services'),
      '@hooks':      resolve(__dirname, 'src/hooks'),
      '@utils':      resolve(__dirname, 'src/utils'),
      '@constants':  resolve(__dirname, 'src/constants'),
      '@assets':     resolve(__dirname, 'src/assets'),
    },
  },

  // ── Dev server ──────────────────────────────────────────────────────────────
  server: {
    port: 3000,
    // Proxy API calls to backend during development (avoids CORS issues).
    proxy: {
      '/api': {
        target:      'http://localhost:5000',
        changeOrigin: true,
        secure:      false,
      },
      '/socket.io': {
        target:  'http://localhost:5000',
        ws:      true,
        changeOrigin: true,
      },
    },
  },

  // ── Build ───────────────────────────────────────────────────────────────────
  build: {
    outDir:          'dist',
    sourcemap:       true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split vendor chunks to improve caching.
      manualChunks(id) {
        if (id.includes('node_modules')) {
          if (['react', 'react-dom', 'react-router-dom'].some((p) => id.includes(p))) return 'vendor';
          if (['@reduxjs/toolkit', 'react-redux', 'redux'].some((p) => id.includes(p)))  return 'redux';
          if (['@mui', '@emotion'].some((p) => id.includes(p)))                           return 'mui';
          if (['leaflet', 'react-leaflet'].some((p) => id.includes(p)))                  return 'maps';
          if (id.includes('socket.io-client'))                                            return 'sockets';
        }
      },
      },
    },
  },
});
