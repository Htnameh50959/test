import { useEffect, useRef } from 'react';

/**
 * Hook to track and broadcast courier GPS location via WebSockets.
 * 
 * @param {import('socket.io-client').Socket} socket - Initialized socket instance
 * @param {string} orderId - The active order being delivered
 * @param {object} options - Configuration options
 * @param {number} options.throttleInterval - Minimum time between broadcasts in ms (default: 5000)
 * @param {boolean} options.enabled - Whether tracking is active
 */
export const useLocationTracking = (socket, orderId, { throttleInterval = 5000, enabled = true } = {}) => {
  const lastSentTime = useRef(0);

  useEffect(() => {
    if (!socket || !orderId || !enabled) return;

    if (!navigator.geolocation) {
      console.error('Geolocation is not supported by this browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, heading, speed } = position.coords;
        const now = Date.now();

        // Throttle updates to avoid flooding the server
        if (now - lastSentTime.current >= throttleInterval) {
          socket.emit('courier:location-update', {
            orderId,
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
            speed: speed || 0,
            timestamp: new Date().toISOString()
          }, (ack) => {
             if (ack?.success) {
               lastSentTime.current = now;
             }
          });
        }
      },
      (error) => {
        console.error('Geolocation error:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [socket, orderId, throttleInterval, enabled]);
};

export default useLocationTracking;
