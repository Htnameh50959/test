// src/components/reviews/ReviewList.jsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Stack, Grid, MenuItem, 
  Select, FormControl, InputLabel, Button, 
  Rating, LinearProgress, Divider, alpha, useTheme
} from '@mui/material';
import { FilterList as FilterIcon, Sort as SortIcon } from '@mui/icons-material';
import ReviewCard from './ReviewCard';

const ReviewList = ({ reviews, restaurantId }) => {
  const theme = useTheme();
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('newest');

  // Logic for stats
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 0;

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percent: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0
  }));

  const filteredReviews = reviews.filter(r => filter === 'all' || r.rating === parseInt(filter));
  
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === 'highest') return b.rating - a.rating;
    if (sort === 'helpful') return (b.helpfulCount || 0) - (a.helpfulCount || 0);
    return 0;
  });

  return (
    <Box sx={{ mt: 2 }}>
      {/* Reviews Header Stats */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid size={{ xs: 12, md: 4 }} sx={{ textAlign: 'center', borderRight: { md: '1px solid' }, borderColor: 'divider' }}>
          <Typography variant="h2" fontWeight={900} color="primary">{averageRating}</Typography>
          <Rating value={parseFloat(averageRating)} readOnly precision={0.1} size="large" />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Based on {reviews.length} total reviews
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={1}>
            {ratingCounts.map((rc) => (
              <Box key={rc.star} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" fontWeight={700} sx={{ minWidth: 20 }}>{rc.star}★</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={rc.percent} 
                  sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'grey.100' }} 
                />
                <Typography variant="body2" color="text.secondary" sx={{ minWidth: 30 }}>{rc.count}</Typography>
              </Box>
            ))}
          </Stack>
        </Grid>
      </Grid>

      <Divider sx={{ mb: 4 }} />

      {/* Filters and Sorting */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" fontWeight={800}>Reviews ({sortedReviews.length})</Typography>
        <Stack direction="row" spacing={2}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel><FilterIcon sx={{ fontSize: 16, mr: 0.5 }} /> Filter</InputLabel>
            <Select
              value={filter}
              label={<span><FilterIcon sx={{ fontSize: 16, mr: 0.5 }} /> Filter</span>}
              onChange={(e) => setFilter(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="all">All Ratings</MenuItem>
              <MenuItem value="5">5★ Stars</MenuItem>
              <MenuItem value="4">4★ Stars</MenuItem>
              <MenuItem value="3">3★ Stars</MenuItem>
              <MenuItem value="2">2★ Stars</MenuItem>
              <MenuItem value="1">1★ Stars</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel><SortIcon sx={{ fontSize: 16, mr: 0.5 }} /> Sort</InputLabel>
            <Select
              value={sort}
              label={<span><SortIcon sx={{ fontSize: 16, mr: 0.5 }} /> Sort</span>}
              onChange={(e) => setSort(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="newest">Most Recent</MenuItem>
              <MenuItem value="highest">Highest Rated</MenuItem>
              <MenuItem value="helpful">Most Helpful</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Box>

      {/* Reviews List */}
      <Stack spacing={3}>
        {sortedReviews.length > 0 ? (
          sortedReviews.map((review) => (
            <ReviewCard key={review._id || review.id} review={review} />
          ))
        ) : (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.secondary">No reviews match your filter.</Typography>
          </Box>
        )}
      </Stack>

      {sortedReviews.length > 5 && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button variant="outlined" sx={{ borderRadius: 6, px: 4 }}>Load More Reviews</Button>
        </Box>
      )}
    </Box>
  );
};

export default ReviewList;
