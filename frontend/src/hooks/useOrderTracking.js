// src/hooks/useOrderTracking.js
import { useState, useEffect } from 'react';
import useSocket from './useSocket';
import { useDispatch } from 'react-redux';
import { updateOrderStatus } from '@/redux/slices/ordersSlice';

export const useOrderTracking = (orderId) => {
  const socket = useSocket();
  const dispatch = useDispatch();
  
  const [orderStatus, setOrderStatus] = useState(null);
  const [courierLocation, setCourierLocation] = useState(null);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    if (socket && orderId) {
      // Subscribe to order updates (Room)
      socket.emit('joinOrderUpdates', orderId);

      // Listen for status updates
      socket.on('orderStatusUpdate', (data) => {
        if (data.orderId === orderId) {
          setOrderStatus(data.status);
          dispatch(updateOrderStatus(data));
        }
      });

      // Listen for courier location updates
      socket.on('courierLocationUpdate', (data) => {
        if (data.orderId === orderId) {
          setCourierLocation({
            lat: data.lat,
            lng: data.lng
          });
        }
      });

      // Listen for ETA updates
      socket.on('orderEtaUpdate', (data) => {
        if (data.orderId === orderId) {
          setEta(data.estimatedTime);
        }
      });

      // Cleanup on unmount
      return () => {
        socket.emit('leaveOrderUpdates', orderId);
        socket.off('orderStatusUpdate');
        socket.off('courierLocationUpdate');
        socket.off('orderEtaUpdate');
      };
    }
  }, [socket, orderId, dispatch]);

  return { orderStatus, courierLocation, eta };
};

export default useOrderTracking;
