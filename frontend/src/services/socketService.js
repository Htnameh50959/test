// src/services/socketService.js
// Singleton Socket.IO client — connects once, exposes helpers to subscribe/emit.
// The connection is established on login and torn down on logout.

import { io } from 'socket.io-client';

import store from '@/redux/store';
import { updateOrderStatus }  from '@/redux/slices/ordersSlice';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;

// ── Connection lifecycle ──────────────────────────────────────────────────────

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth:            { token },
    transports:      ['websocket', 'polling'],
    reconnection:    true,
    reconnectionDelay:    1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.warn('[Socket] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected:', reason);
  });

  // ── Global event listeners ────────────────────────────────────────────────

  // Order status pushed by the server → update Redux state.
  socket.on('orderStatusUpdate', (payload) => {
    store.dispatch(updateOrderStatus(payload));
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// ── Room subscriptions ────────────────────────────────────────────────────────

export const joinOrderRoom = (orderId) => {
  socket?.emit('joinOrderUpdates', orderId);
};

export const leaveOrderRoom = (orderId) => {
  socket?.emit('leaveOrderUpdates', orderId);
};

// ── Raw event subscription (for components) ───────────────────────────────────

export const onSocketEvent = (event, callback) => {
  socket?.on(event, callback);
  return () => socket?.off(event, callback);   // returns cleanup function
};

export const getSocket = () => socket;
