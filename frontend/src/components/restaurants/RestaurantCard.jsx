import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardMedia, CardContent, CardActionArea, Box, Typography,
  Chip, Stack, Button, Skeleton, Rating, Divider, useTheme, alpha
} from '@mui/material';
import {
  AccessTime,
  DeliveryDining,
  LocationOn,
  TrendingUp,
  LocalOffer
} from '@mui/icons-material';
import { formatCurrency, formatDistance } from '@/utils';
import OptimizedImage from '../common/OptimizedImage';

/**
 * RestaurantCard
 * 
 * A rich display card for restaurant search results.
 * Supports fallback images, price range symbols, and badges for features.
 */
export const RestaurantCard = React.memo(({ restaurant }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  if (!restaurant) return null;

  const handleNavigate = () => {
    navigate(`/restaurants/${restaurant._id}`);
  };

  const handleQuickOrder = (e) => {
    e.stopPropagation();
    navigate(`/restaurants/${restaurant._id}`);
  };

  // Convert distance from metres to readable format if available
  const displayDistance = restaurant.distanceKm != null 
    ? formatDistance(restaurant.distanceKm)
    : null;

  // Price range helper ($ to $$$$)
  const renderPriceRange = (range) => {
    const symbols = '$'.repeat(range || 1);
    const empty = '$'.repeat(4 - (range || 1));
    return (
      <Box component="span" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
        <Box component="span" sx={{ color: 'primary.main' }}>{symbols}</Box>
        <Box component="span" sx={{ color: 'text.disabled' }}>{empty}</Box>
      </Box>
    );
  };

  return (
    <Card 
      className="gpu-layer"
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease',
        '&:hover': { 
          transform: 'translateY(-8px)',
          boxShadow: `0 20px 40px ${alpha(theme.palette.common.black, 0.15)}`,
        }
      }}
    >
      <CardActionArea sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }} onClick={handleNavigate}>
        {/* Image Section */}
        <Box sx={{ position: 'relative', overflow: 'hidden' }}>
          <OptimizedImage
            src={restaurant.coverImage || `https://picsum.photos/seed/${restaurant._id}/400/220`}
            alt={restaurant.name}
            aspectRatio="16/9"
          />
          
          {/* Overlay Badges */}
          <Box sx={{ position: 'absolute', top: 12, left: 12, display: 'flex', flexWrap: 'wrap', gap: 0.5, zIndex: 3 }}>
            {restaurant.isFeatured && (
              <Chip 
                label="Featured" 
                size="small" 
                icon={<TrendingUp sx={{ fontSize: '0.8rem !important' }} />}
                sx={{ 
                  bgcolor: alpha(theme.palette.warning.main, 0.9), 
                  color: 'white', 
                  fontWeight: 700,
                  backdropFilter: 'blur(4px)',
                  border: 'none'
                }} 
              />
            )}
            {restaurant.deliveryFee === 0 && (
              <Chip 
                label="Free Delivery" 
                size="small" 
                icon={<LocalOffer sx={{ fontSize: '0.8rem !important' }} />}
                sx={{ 
                  bgcolor: alpha(theme.palette.success.main, 0.9), 
                  color: 'white', 
                  fontWeight: 700,
                  backdropFilter: 'blur(4px)',
                  border: 'none'
                }} 
              />
            )}
          </Box>

          <Box sx={{ position: 'absolute', bottom: 12, right: 12, zIndex: 3 }}>
            <Chip 
              label={restaurant.isOpen ? 'Open Now' : 'Closed'} 
              size="small"
              color={restaurant.isOpen ? 'success' : 'default'}
              sx={{ 
                fontWeight: 700, 
                px: 1,
                bgcolor: restaurant.isOpen ? alpha(theme.palette.success.main, 0.85) : alpha(theme.palette.grey[500], 0.85),
                color: 'white',
                backdropFilter: 'blur(4px)'
              }}
            />
          </Box>
        </Box>

        {/* Content Section */}
        <CardContent sx={{ p: 2, flexGrow: 1 }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5, lineHeight: 1.2, color: 'text.primary' }}>
            {restaurant.name}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1.5 }}>
            {restaurant.cuisineTypes?.join(' • ')}
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
            {/* Rating */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Rating value={restaurant.rating?.average || 0} precision={0.1} readOnly size="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption" fontWeight={700}>
                {restaurant.rating?.average?.toFixed(1) || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.3 }}>
                 ({restaurant.rating?.count || 0})
              </Typography>
            </Box>

            {/* Price indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {renderPriceRange(restaurant.priceRange)}
            </Box>
          </Stack>

          <Divider sx={{ mb: 1.5, opacity: 0.5 }} />

          {/* Quick Info Grid */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.primary" fontWeight={600}>
                {restaurant.estimatedDeliveryTime?.min}-{restaurant.estimatedDeliveryTime?.max} min
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <DeliveryDining sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.primary" fontWeight={600}>
                {restaurant.deliveryFee === 0 ? 'Free' : formatCurrency(restaurant.deliveryFee)}
              </Typography>
            </Box>

            {displayDistance && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.primary" fontWeight={600}>
                  {displayDistance} away
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </CardActionArea>

      {/* Footer Action */}
      <Box sx={{ p: 2, pt: 0 }}>
        <Button 
          fullWidth 
          variant="contained" 
          onClick={handleQuickOrder}
          sx={{ 
            borderRadius: 3, 
            py: 1, 
            textTransform: 'none', 
            fontWeight: 700,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}
        >
          View Menu & Order
        </Button>
      </Box>
    </Card>
  );
});

/**
 * RestaurantSkeleton
 */
export const RestaurantSkeleton = () => (
  <Card sx={{ height: '100%', borderRadius: 4 }}>
    <Skeleton variant="rectangular" height={180} />
    <CardContent>
      <Skeleton width="80%" height={32} />
      <Skeleton width="60%" height={24} sx={{ mb: 2 }} />
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Skeleton width="30%" height={20} />
        <Skeleton width="20%" height={20} />
      </Stack>
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <Skeleton width="80%" height={20} />
        <Skeleton width="80%" height={20} />
      </Box>
    </CardContent>
    <Box sx={{ p: 2, pt: 0 }}>
      <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 3 }} />
    </Box>
  </Card>
);
