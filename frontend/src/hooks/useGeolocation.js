import { useState, useEffect } from 'react';

import { DEFAULT_LOCATION } from '@/constants';

export const useGeolocation = ({ autoRequest = false } = {}) => {
  const [location, setLocation] = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(autoRequest);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setLocation(DEFAULT_LOCATION);
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLocation(DEFAULT_LOCATION);
        setLoading(false);
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  useEffect(() => { if (autoRequest) requestLocation(); }, []);

  return { location, error, loading, requestLocation };
};
