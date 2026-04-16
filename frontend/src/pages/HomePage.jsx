import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Button, Grid, Chip, InputBase,
  Paper, useMediaQuery, useTheme, Skeleton, alpha, Avatar
} from '@mui/material';

import {
  Search as SearchIcon, LocalDining, DeliveryDining, EventNote, Map as MapIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';

import {
  searchRestaurants,
  selectSearchResults,
  selectRestaurantsLoading,
} from '@/redux/slices/restaurantsSlice';
import { useGeolocation } from '@/hooks/useGeolocation';
import { CUISINE_TYPES } from '@/constants';
import { RestaurantCard, RestaurantSkeleton } from '@/components/restaurants/RestaurantCard';
import { MapView } from '@/components/restaurants/MapView';

const CUISINE_ICONS = {
  Indian: '🍛', 'North Indian': '🫓', 'South Indian': '🥘', Chinese: '🥢',
  Italian: '🍝', Mexican: '🌮', Thai: '🍜', Japanese: '🍣',
  American: '🍔', Mediterranean: '🫒', Biryani: '🍚', Pizza: '🍕',
  Burger: '🍔', Desserts: '🍰', Beverages: '🥤',
};

const FEATURES = [
  { icon: <LocalDining sx={{ fontSize: 36, color: 'primary.main' }} />, title: 'Dine In', desc: 'Reserve a table at top restaurants' },
  { icon: <DeliveryDining sx={{ fontSize: 36, color: 'primary.main' }} />, title: 'Fast Delivery', desc: 'Hot food at your door in 30 min' },
  { icon: <EventNote sx={{ fontSize: 36, color: 'primary.main' }} />, title: 'Live Events', desc: 'Discover food festivals & pop-ups' },
];

export default function HomePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const results = useSelector(selectSearchResults);
  const loading = useSelector(selectRestaurantsLoading);
  const user = useSelector(state => state.auth.user);
  const isAuthenticated = useSelector(state => state.auth.isAuthenticated);
  const { location, loading: geoLoading } = useGeolocation({ autoRequest: true });
  const [query, setQuery] = useState('');

  useEffect(() => {
    dispatch(searchRestaurants({ radius: 2500000, limit: 6, sort: 'rating' }));
  }, [dispatch]);

  useEffect(() => {
    if (!geoLoading && location?.lat && location?.lng) {
      dispatch(searchRestaurants({ radius: 2500000, limit: 6, sort: 'rating', lat: location.lat, lng: location.lng }));
    }
  }, [dispatch, geoLoading, location?.lat, location?.lng]);

  const displayResults = results.slice(0, 6);

  return (
    <Box>
      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          background: 'linear-gradient(140deg, #1D3557 0%, #2C4A7C 50%, #D85830 100%)',
          py: { xs: 12, md: 18 },
          px: 2,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(216,88,48,0.18) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06) 0%, transparent 50%)' }} />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          {isAuthenticated && user && (
            <Box sx={{ mb: 4, display: 'inline-flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(255,255,255,0.08)', px: 3, py: 1, borderRadius: 10, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Avatar 
                sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 800, border: '2px solid rgba(255,255,255,0.2)' }}
              >
                {user.profile?.firstName?.[0] || 'U'}
              </Avatar>
              <Typography variant="body2" color="white" fontWeight={700}>
                Welcome back, {user.profile?.firstName}!
              </Typography>
            </Box>
          )}

          {!isAuthenticated && (
            <Chip
              label="🔥 1,200+ restaurants available"
              sx={{ mb: 3, bgcolor: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 700, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          )}
          <Typography
            variant="h1"
            sx={{
              color: 'white', fontWeight: 900, letterSpacing: '-0.03em',
              fontSize: { xs: '2.4rem', sm: '3.5rem', md: '4.5rem' },
              lineHeight: 1.08, mb: 2,
            }}
          >
            Food You Love,{' '}
            <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 400, opacity: 0.85 }}>
              Delivered
            </Box>
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.75)', mb: 6, fontWeight: 400, maxWidth: 520, mx: 'auto', lineHeight: 1.5 }}>
            Discover the best restaurants, reserve tables, and track your order in real time.
          </Typography>

          <Paper
            component="form"
            onSubmit={(e) => { 
              e.preventDefault(); 
              const trimmed = query.trim();
              navigate(trimmed ? `/search?q=${trimmed}` : '/search'); 
            }}
            elevation={0}
            sx={{
              display: 'flex', alignItems: 'center', maxWidth: 680, mx: 'auto',
              bgcolor: 'white', borderRadius: 10, p: '6px 6px 6px 20px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
            }}
          >

            <SearchIcon sx={{ color: 'text.secondary', mr: 1.5, flexShrink: 0 }} />
            <InputBase
              placeholder="Search restaurants, dishes, cuisines..."
              sx={{ flex: 1, fontSize: '1.05rem', fontWeight: 600 }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              sx={{ borderRadius: 8, px: { xs: 3, md: 5 }, py: 1.6, fontWeight: 900, flexShrink: 0, boxShadow: 'none', fontSize: '0.95rem' }}
            >
              {isMobile ? '→' : 'EXPLORE'}
            </Button>
          </Paper>

          {/* Quick cuisine links */}
          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap', mt: 4 }}>
            {CUISINE_TYPES.slice(0, 6).map((c) => (
              <Chip
                key={c}
                label={`${CUISINE_ICONS[c] || '🍽'} ${c}`}
                onClick={() => navigate(`/search?q=${c}`)}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 700,
                  border: '1px solid rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(8px)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
                  cursor: 'pointer',
                }}
              />
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <Box sx={{ bgcolor: '#FAFAFA', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,1fr)' }, divide: 'x' }}>
            {FEATURES.map((f, i) => (
              <Box key={i} sx={{ py: 4, px: 5, display: 'flex', alignItems: 'center', gap: 2.5, borderRight: i < 2 ? { sm: '1px solid' } : 'none', borderColor: 'divider' }}>
                {f.icon}
                <Box>
                  <Typography fontWeight={800} variant="body1">{f.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── NEARBY / POPULAR SECTION ──────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 5 }}>
          <Box>
            <Typography variant="overline" fontWeight={900} color="primary" sx={{ letterSpacing: 3, display: 'block', mb: 0.5 }}>
              {location?.lat ? 'NEARBY' : 'POPULAR'}
            </Typography>
            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -0.5 }}>
              {location?.lat ? 'Restaurants Near You' : 'Top-Rated Restaurants'}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            onClick={() => navigate('/search')}
            sx={{ fontWeight: 800, borderRadius: 3, px: 3, display: { xs: 'none', sm: 'flex' } }}
          >
            View All →
          </Button>
        </Box>

        <Grid container spacing={3}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                  <RestaurantSkeleton />
                </Grid>
              ))
            : displayResults.map((r) => (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={r._id}>
                  <RestaurantCard restaurant={r} />
                </Grid>
              ))
          }
        </Grid>

        {!loading && displayResults.length === 0 && (
          <Box sx={{
            textAlign: 'center', py: 10, mt: 4,
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            borderRadius: 4, border: '1px dashed', borderColor: alpha(theme.palette.primary.main, 0.2)
          }}>
            <Typography variant="h2" sx={{ mb: 1 }}>📍</Typography>
            <Typography variant="h5" fontWeight={900}>No restaurants found</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Make sure your database has active restaurants with <strong>isActive: true</strong>.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/search')} sx={{ mt: 3, fontWeight: 900, borderRadius: 3 }}>
              Browse All
            </Button>
          </Box>
        )}

        <Box sx={{ textAlign: 'center', mt: 6, display: { sm: 'none' } }}>
          <Button variant="outlined" onClick={() => navigate('/search')} sx={{ fontWeight: 800, borderRadius: 3, px: 5 }}>
            View All Restaurants →
          </Button>
        </Box>
      </Container>

      {/* ── LIVE MAP ──────────────────────────────────────────────────────── */}
      {displayResults.length > 0 && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4 }}>
              <Box>
                <Typography variant="overline" fontWeight={900} color="primary" sx={{ letterSpacing: 3, display: 'block', mb: 0.5 }}>
                  EXPLORE
                </Typography>
                <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -0.5 }}>
                  Restaurants Near You
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Browse restaurants on the live map
                </Typography>
              </Box>
              <Button
                variant="outlined"
                startIcon={<MapIcon />}
                onClick={() => navigate('/search')}
                sx={{ fontWeight: 800, borderRadius: 3, px: 3, display: { xs: 'none', sm: 'flex' } }}
              >
                Full Map →
              </Button>
            </Box>
            <Box sx={{
              height: 420,
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            }}>
              <MapView
                restaurants={displayResults}
                userLocation={location}
                onMarkerClick={(id) => navigate(`/search`)}
              />
            </Box>
          </Container>
        </Box>
      )}

      {/* ── CUISINE CATEGORIES ──────────────────────────────────────────── */}
      <Box sx={{ bgcolor: '#F7F7F7', py: { xs: 6, md: 10 }, borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="overline" fontWeight={900} color="primary" sx={{ letterSpacing: 3, display: 'block', mb: 0.5, textAlign: 'center' }}>
            BROWSE BY CUISINE
          </Typography>
          <Typography variant="h4" fontWeight={900} sx={{ textAlign: 'center', mb: 5, letterSpacing: -0.5 }}>
            What are you craving?
          </Typography>
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(3,1fr)', sm: 'repeat(5,1fr)', md: 'repeat(8,1fr)' },
            gap: 2,
          }}>
            {CUISINE_TYPES.map((c) => (
              <Box
                key={c}
                onClick={() => navigate(`/search?q=${c}`)}
                sx={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 1, p: 2, borderRadius: 3, cursor: 'pointer',
                  bgcolor: 'white', border: '1px solid', borderColor: 'divider',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: 'primary.main',
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.12)}`,
                  },
                }}
              >
                <Typography sx={{ fontSize: '1.8rem', lineHeight: 1 }}>{CUISINE_ICONS[c] || '🍽'}</Typography>
                <Typography variant="caption" fontWeight={800} sx={{ lineHeight: 1.2, textAlign: 'center' }}>{c}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* ── CTA BANNER ──────────────────────────────────────────────────── */}
      <Box sx={{ background: 'linear-gradient(135deg, #D85830 0%, #E86B40 100%)', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" fontWeight={900} color="white" sx={{ mb: 2, letterSpacing: -0.5 }}>
            Ready to eat?
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.85)', mb: 4, fontWeight: 400 }}>
            Browse hundreds of restaurants and get your order delivered in minutes.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/search')}
            sx={{
              bgcolor: 'white', color: 'primary.main', fontWeight: 900, px: 6, py: 2,
              borderRadius: 8, fontSize: '1rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              '&:hover': { bgcolor: '#f5f5f5' },
            }}
          >
            Find Restaurants Now
          </Button>
        </Container>
      </Box>
    </Box>
  );
}
