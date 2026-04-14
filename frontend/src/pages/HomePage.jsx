import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Container, Typography, TextField, Button, Grid, Card, CardMedia,
  CardContent, CardActionArea, Chip, Skeleton, InputAdornment, MenuItem,
  Select, FormControl, InputLabel, Slider, Divider, Alert, Paper, InputBase,
  useMediaQuery, useTheme
} from '@mui/material';
import { Search as SearchIcon, LocationOn, Star, AccessTime, DeliveryDining } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';

import { searchRestaurants, selectSearchResults, selectRestaurantsLoading, selectRestaurantsError } from '@/redux/slices/restaurantsSlice';
import { useGeolocation } from '@/hooks/useGeolocation';
import { CUISINE_TYPES, DEFAULT_LOCATION } from '@/constants';
import { RestaurantCard, RestaurantSkeleton } from '@/components/restaurants/RestaurantCard';

export default function HomePage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const theme     = useTheme();
  const isTablet  = useMediaQuery(theme.breakpoints.down('md'));

  const results   = useSelector(selectSearchResults);
  const loading   = useSelector(selectRestaurantsLoading);
  const error     = useSelector(selectRestaurantsError);
  const { location, loading: geoLoading } = useGeolocation({ autoRequest: true });
  
  const [query, setSearchQuery] = useState('');

  const displayResults = results.slice(0, 6);

  useEffect(() => { 
    // Trigger search when location is resolved or when component mounts
    // Include large radius for initial discoverability
    const searchParams = { 
      radius: 2500000,
      ...(location?.lat && location?.lng && { lat: location.lat, lng: location.lng })
    };
    
    dispatch(searchRestaurants(searchParams));
  }, [dispatch, location?.lat, location?.lng]);

  return (
    <Box>
      {/* ── HERO SECTION ──────────────────────────────────────────────────────── */}
      <Box 
        sx={{ 
          position: 'relative',
          background: 'linear-gradient(135deg, #1D3557 0%, #D85830 100%)', 
          py: { xs: 10, md: 16 }, 
          px: 2,
          overflow: 'hidden'
        }}
      >
        {/* Decorative Kinetic Shapes */}
        <Box sx={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)' }} />
        <Box sx={{ position: 'absolute', bottom: -50, left: -50, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(230,57,70,0.05) 0%, transparent 70%)' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography 
            variant="h1" 
            sx={{ 
              textAlign: 'center', 
              color: 'white', 
              mb: 2, 
              fontSize: { xs: '2.5rem', md: '4rem' },
              fontWeight: 900,
              letterSpacing: '-0.04em',
              textShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
          >
            Kinetic Flavours, <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 500, opacity: 0.9 }}>Curated</Box> for You
          </Typography>
          
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'rgba(255,255,255,0.85)', 
              textAlign: 'center', 
              mb: 6, 
              maxWidth: 600,
              fontWeight: 500,
              lineHeight: 1.4
            }}
          >
            Discover the most exclusive dining experiences and instant delivery from the city's top-rated hidden gems.
          </Typography>

          <Paper
            component="form"
            onSubmit={(e) => {
               e.preventDefault();
               navigate(`/search?q=${query}`);
            }}
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              maxWidth: 700,
              bgcolor: 'white',
              borderRadius: 10,
              p: 1.2,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Box sx={{ px: 2, display: 'flex', alignItems: 'center', flex: 1 }}>
               <SearchIcon sx={{ color: 'primary.main', mr: 2 }} />
               <InputBase
                 placeholder="Search by restaurant, dish or cuisine..."
                 sx={{ flex: 1, fontSize: '1.1rem', fontWeight: 600 }}
                 value={query}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </Box>
            <Button 
               type="submit" 
               variant="contained" 
               size="large"
               sx={{ 
                 borderRadius: 8, 
                 px: 6, 
                 py: 2, 
                 fontWeight: 900, 
                 fontSize: '1rem',
                 boxShadow: 'none'
               }}
            >
               EXPLORE
            </Button>
          </Paper>
        </Container>
      </Box>

      {/* ── DISCOVERY SECTION ─────────────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 8 }}>
          <Box>
            <Typography variant="caption" fontWeight={900} color="primary" sx={{ letterSpacing: 2, mb: 1, display: 'block' }}>LOCAL FAVOURITES</Typography>
            <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1 }}>Popular <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>Nearby</Box></Typography>
          </Box>
          <Button 
            variant="text" 
            onClick={() => navigate('/search')} 
            sx={{ fontWeight: 900, px: 3, borderRadius: 2, color: 'text.primary' }}
          >
            VIEW ALL CATALOGUES →
          </Button>
        </Box>

        <Grid container spacing={5}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <Grid xs={12} sm={6} lg={4} key={i}><RestaurantSkeleton /></Grid>)
            : displayResults.map((r) => (
                <Grid xs={12} sm={6} lg={4} key={r._id}>
                   <RestaurantCard restaurant={r} />
                </Grid>
              ))
          }
        </Grid>

        {results.length === 0 && !loading && (
           <Box sx={{ textAlign: 'center', py: 10, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 8, mt: 4 }}>
              <Typography variant="h2">📍</Typography>
              <Typography variant="h5" fontWeight={900} mt={2}>We're expanding!</Typography>
              <Typography color="text.secondary" fontWeight={500}>No active restaurants found in your database.</Typography>
              <Button onClick={() => navigate('/search')} sx={{ mt: 2, fontWeight: 900 }}>Browse Global Selection</Button>
           </Box>
        )}
      </Container>
    </Box>
  );
}
