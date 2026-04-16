import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * usePageTracking
 * A hook that listens to route changes and 'tracks' the page view.
 * In a real-world scenario, this would send data to Google Analytics, Mixpanel, etc.
 */
const usePageTracking = () => {
  const location = useLocation();

  useEffect(() => {
    const { pathname, search } = location;
    
    // Silent tracking activation
    // In production, this would dispatch to an analytics buffer.
    
    const timer = setTimeout(() => {
        // Ensure title is branded if it's missing or legacy
        if (!document.title || document.title.includes('Hospitality Platform')) {
            document.title = 'The Kinetic Curator | Gourmet Experience';
        }
    }, 100);

    return () => clearTimeout(timer);
  }, [location]);
};

export default usePageTracking;
