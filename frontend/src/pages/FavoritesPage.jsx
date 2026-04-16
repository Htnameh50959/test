import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box, Button, Chip, Container, Grid, IconButton, Paper,
  Skeleton, Stack, Tooltip, Typography, alpha,
} from '@mui/material';
import { Favorite, FavoriteBorder, LocationOn, Star, Timer, DeliveryDining } from '@mui/icons-material';
import { fetchFavorites, removeFavorite, selectFavorites, selectFavoritesLoading } from '@/redux/slices/favoritesSlice';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';

const FavoriteCard = ({ restaurant, onRemove }) => {
  const img = restaurant.images?.[0] || `https://source.unsplash.com/480x300/?restaurant,food`;

  return (
    <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider', transition: 'all 0.2s', '&:hover': { boxShadow: '0 8px 24px rgba(0,0,0,0.1)', transform: 'translateY(-2px)' } }}>
      <Box sx={{ position: 'relative', height: 180 }}>
        <Box component="img" src={img} alt={restaurant.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
        <Tooltip title="Remove from favorites">
          <IconButton onClick={() => onRemove(restaurant._id)} size="small" sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'white', '&:hover': { bgcolor: 'white' } }}>
            <Favorite sx={{ color: 'error.main', fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        {restaurant.isVerified && (
          <Chip label="Verified" size="small" sx={{ position: 'absolute', bottom: 10, left: 10, bgcolor: 'success.main', color: 'white', fontWeight: 700, fontSize: '0.7rem' }} />
        )}
      </Box>
      <Box sx={{ p: 2.5 }}>
        <Typography variant="subtitle1" fontWeight={800} noWrap>{restaurant.name}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mb: 1.5 }}>
          {Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine}
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Star sx={{ fontSize: 13, color: '#FFB300' }} />
            <Typography variant="caption" fontWeight={700}>{restaurant.rating?.toFixed(1) || 'New'}</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Timer sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{restaurant.deliveryTime || '30-40'} min</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <DeliveryDining sx={{ fontSize: 13, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">Free</Typography>
          </Stack>
        </Stack>
        <Button component={Link} to={`/restaurants/${restaurant._id}`} fullWidth variant="outlined" size="small" sx={{ borderRadius: 3, fontWeight: 700 }}>
          View Menu
        </Button>
      </Box>
    </Paper>
  );
};

export default function FavoritesPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const favorites = useSelector(selectFavorites);
  const loading = useSelector(selectFavoritesLoading);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    dispatch(fetchFavorites());
  }, [dispatch, isAuthenticated, navigate]);

  const handleRemove = (restaurantId) => {
    dispatch(removeFavorite(restaurantId));
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 5 }}>
      <Container maxWidth="lg">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 5 }}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
              <Favorite sx={{ color: 'error.main', fontSize: 28 }} />
              <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>My Favorites</Typography>
            </Stack>
            <Typography color="text.secondary">Your saved restaurants — all in one place.</Typography>
          </Box>
          <Chip label={`${favorites.length} saved`} color="primary" sx={{ fontWeight: 800 }} />
        </Stack>

        {loading ? (
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                  <Skeleton height={180} variant="rectangular" />
                  <Box sx={{ p: 2.5 }}>
                    <Skeleton height={22} width="70%" sx={{ mb: 1 }} />
                    <Skeleton height={16} width="50%" sx={{ mb: 1.5 }} />
                    <Skeleton height={32} />
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : favorites.length === 0 ? (
          <Paper elevation={0} sx={{ p: 10, textAlign: 'center', borderRadius: 6, border: '1px solid', borderColor: 'divider' }}>
            <FavoriteBorder sx={{ fontSize: 72, color: 'grey.300', mb: 3 }} />
            <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>No favorites yet</Typography>
            <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
              Tap the heart icon on any restaurant to save it here for quick access.
            </Typography>
            <Button variant="contained" size="large" component={Link} to="/" sx={{ borderRadius: 4, px: 5, py: 1.5, fontWeight: 800 }}>
              Browse Restaurants
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {favorites.map(restaurant => (
              <Grid key={restaurant._id} size={{ xs: 12, sm: 6, md: 4 }}>
                <FavoriteCard restaurant={restaurant} onRemove={handleRemove} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
