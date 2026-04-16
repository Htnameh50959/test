import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, Grid, Typography, LinearProgress, Stack, 
  Avatar, Rating, Button, Chip, ButtonBase, Paper, CircularProgress
} from '@mui/material';
import { ThumbUpAltOutlined, FilterList } from '@mui/icons-material';
import { 
  fetchRestaurantReviews, 
  selectRestaurantReviews,
  selectRestaurantsLoading 
} from '@/redux/slices/restaurantsSlice';
import { formatRelativeTime } from '@/utils/formatters';

export const ReviewSection = ({ restaurantId, analytics }) => {
  const dispatch = useDispatch();
  const reviews = useSelector(selectRestaurantReviews);
  const loading = useSelector(selectRestaurantsLoading);
  
  const [filterRating, setFilterRating] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchRestaurantReviews({ restaurantId, params: { rating: filterRating, page, limit: 10 } }));
  }, [restaurantId, filterRating, page, dispatch]);

  return (
    <Box>
      <Grid container spacing={6}>
        {/* Analytics Left Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: 'sticky', top: 120 }}>
            <Typography variant="h6" fontWeight={900} gutterBottom>Review Summary</Typography>
            
            {analytics ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, mb: 4 }}>
                  <Typography variant="h2" fontWeight={900} lineHeight={1}>{analytics.averageRating?.toFixed(1) || '0.0'}</Typography>
                  <Box sx={{ pb: 0.5 }}>
                    <Rating value={analytics.averageRating || 0} readOnly precision={0.1} />
                    <Typography variant="body2" color="text.secondary">Based on {analytics.totalReviews || 0} reviews</Typography>
                  </Box>
                </Box>

                {/* Distribution */}
                <Stack spacing={1} sx={{ mb: 4 }}>
                  {[5, 4, 3, 2, 1].map(stars => {
                    const count = analytics.ratingDistribution?.[stars] || 0;
                    const pct = analytics.totalReviews ? (count / analytics.totalReviews) * 100 : 0;
                    return (
                      <Box key={stars} sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', opacity: filterRating && filterRating !== stars ? 0.4 : 1 }} onClick={() => setFilterRating(filterRating === stars ? null : stars)}>
                        <Typography variant="body2" fontWeight={700} sx={{ width: 12 }}>{stars}</Typography>
                        <Rating max={1} value={1} readOnly sx={{ color: '#F4A261', '& .MuiRating-iconFilled': { fontSize: '1rem' } }} />
                        <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.05)', '& .MuiLinearProgress-bar': { bgcolor: '#F4A261', borderRadius: 4 } }} />
                        <Typography variant="caption" color="text.secondary" sx={{ width: 30, textAlign: 'right' }}>{count}</Typography>
                      </Box>
                    );
                  })}
                </Stack>
                {filterRating && (
                  <Button size="small" onClick={() => setFilterRating(null)} sx={{ mb: 4, fontWeight: 700 }}>
                    Clear Filter
                  </Button>
                )}

                {/* Sub-categories */}
                <Typography variant="subtitle2" fontWeight={800} gutterBottom>Category Ratings</Typography>
                <Stack spacing={2}>
                  {['Food', 'Service', 'Ambiance', 'Value'].map(cat => (
                    <Box key={cat}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{cat}</Typography>
                        <Typography variant="body2" fontWeight={700}>{analytics.categoryRatings?.[cat.toLowerCase()]?.toFixed(1) || '4.5'}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={((analytics.categoryRatings?.[cat.toLowerCase()] || 4.5) / 5) * 100} sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(0,0,0,0.05)' }} />
                    </Box>
                  ))}
                </Stack>
              </>
            ) : (
              <Typography color="text.secondary">No analytics available yet.</Typography>
            )}
          </Box>
        </Grid>

        {/* Review Feed */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight={900}>Customer Reviews</Typography>
            <Button startIcon={<FilterList />} size="small" sx={{ fontWeight: 700, color: 'text.secondary' }}>Sort by: Helpful</Button>
          </Box>

          <Stack spacing={3}>
            {loading && page === 1 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
            ) : reviews?.length > 0 ? (
              reviews.map(review => (
                <Paper key={review._id} elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Avatar src={review.user?.avatar} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800}>{review.user?.name || 'Anonymous'}</Typography>
                        <Typography variant="caption" color="text.secondary">{formatRelativeTime(review.createdAt)}</Typography>
                      </Box>
                    </Box>
                    <Rating value={review.rating} precision={0.5} readOnly size="small" sx={{ color: '#F4A261' }} />
                  </Box>
                  
                  <Typography variant="body1" sx={{ mb: 2 }}>{review.content}</Typography>

                  {review.photos?.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto' }}>
                      {review.photos.map((photo, i) => (
                         <ButtonBase key={i} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                            <Box component="img" src={photo} sx={{ width: 80, height: 80, objectFit: 'cover' }} />
                         </ButtonBase>
                      ))}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Button size="small" startIcon={<ThumbUpAltOutlined />} sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'none' }}>
                      Helpful ({review.helpfulCount || 0})
                    </Button>
                  </Box>
                </Paper>
              ))
            ) : (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                 <Typography variant="h6" fontWeight={700}>No reviews found.</Typography>
                 <Typography color="text.secondary">Be the first to leave a review!</Typography>
              </Box>
            )}
          </Stack>

          {/* Load More */}
          {reviews?.length >= 10 && !loading && (
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={() => setPage(p => p + 1)}
              sx={{ mt: 4, borderRadius: 3, fontWeight: 700, py: 1.5 }}
            >
              Load More Reviews
            </Button>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};
