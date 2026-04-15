import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Box, Typography, Button, Rating, Paper, alpha, useTheme, CircularProgress } from '@mui/material';
import { Star, Restaurant, DirectionsRun } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';

// Custom Marker Icon for Restaurants
const createRestaurantIcon = (theme) => new L.Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${theme.palette.primary.main.replace('#','%23')}" stroke="white" stroke-width="2"/>
    </svg>
  `)}`,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// Helper to update map view when center/restaurants change
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
      // Classic Leaflet fix: invalidating size ensures tiles fill the container
      // when it becomes visible or changes size.
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [center, map]);

  // Also invalidate size on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

export const MapView = ({ restaurants, userLocation, onMarkerClick, darkTheme = false }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const resIcon = useMemo(() => createRestaurantIcon(theme), [theme]);

  const center = useMemo(() => {
    if (userLocation?.lat && userLocation?.lng) return [userLocation.lat, userLocation.lng];
    if (restaurants?.length > 0) {
      const first = restaurants[0];
      return [first.location.coordinates[1], first.location.coordinates[0]];
    }
    return [17.3850, 78.4867];
  }, [userLocation, restaurants]);

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative', '& .leaflet-container': { height: '100%', width: '100%', zIndex: 1 } }}>
      <MapContainer center={center} zoom={13} scrollWheelZoom={true}>
        <MapUpdater center={center} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

        {userLocation?.lat && userLocation?.lng && (
          <Marker position={[userLocation.lat, userLocation.lng]}>
             <Popup>Your Location</Popup>
          </Marker>
        )}

        {restaurants?.filter(r => r.location?.coordinates?.length === 2).map((r) => (
          <Marker 
            key={r._id} 
            position={[r.location.coordinates[1], r.location.coordinates[0]]}
            icon={resIcon}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(r._id)
            }}
          >
            <Popup minWidth={200}>
               <Typography variant="subtitle2" fontWeight={900}>{r.name}</Typography>
               <Button 
                variant="contained" 
                size="small" 
                fullWidth 
                onClick={() => navigate(`/restaurant/${r.slug}`)}
                sx={{ mt: 1, borderRadius: 2, fontWeight: 900 }}
               >
                 View Restaurant
               </Button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
};
