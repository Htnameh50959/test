import { useState, useEffect } from 'react';

/**
 * useDebounce
 * 
 * Simple debouncing hook to delay value updates.
 * Useful for search inputs and filter changes.
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
