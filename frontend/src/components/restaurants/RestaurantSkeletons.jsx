import React from 'react';
import { Box, Container, Grid, Skeleton, Stack, Divider, Paper } from '@mui/material';

/**
 * RestaurantDetailSkeleton
 * Loading state for the main restaurant profile page.
 */
export const RestaurantDetailSkeleton = () => (
  <Box>
    {/* Hero Skeleton */}
    <Skeleton variant="rectangular" height={350} width="100%" />

    <Container maxWidth="lg" sx={{ mt: -6, position: 'relative', zIndex: 10 }}>
      {/* Header Info Paper */}
      <Paper sx={{ p: 4, borderRadius: 4, boxShadow: 4, mb: 4 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Skeleton width="60%" height={48} sx={{ mb: 1 }} />
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Skeleton width={80} height={32} sx={{ borderRadius: 2 }} />
              <Skeleton width={80} height={32} sx={{ borderRadius: 2 }} />
            </Stack>
            <Stack direction="row" spacing={3}>
              <Skeleton width={120} height={24} />
              <Skeleton width={100} height={24} />
            </Stack>
          </Grid>
          <Grid item xs={12} md={4} sx={{ display: 'flex', justifyContent: { md: 'flex-end' }, alignItems: 'center' }}>
            <Skeleton variant="circular" width={56} height={56} />
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', gap: 4 }}>
          <Skeleton width={100} height={50} />
          <Skeleton width={100} height={50} />
          <Skeleton width={100} height={50} />
        </Box>
      </Paper>

      {/* Tabs Skeleton */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Stack direction="row" spacing={4}>
          <Skeleton width={80} height={40} />
          <Skeleton width={80} height={40} />
          <Skeleton width={80} height={40} />
        </Stack>
      </Box>

      {/* Content Skeleton */}
      <Grid container spacing={4}>
        <Grid item xs={12} md={3}>
          <Stack spacing={2}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={40} width="100%" />
            ))}
          </Stack>
        </Grid>
        <Grid item xs={12} md={9}>
          <Grid container spacing={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Grid item xs={12} key={i}>
                <Paper sx={{ p: 2, display: 'flex', gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="40%" height={24} />
                    <Skeleton width="90%" height={20} />
                    <Skeleton width="20%" height={28} />
                  </Box>
                  <Skeleton variant="rectangular" width={120} height={120} sx={{ borderRadius: 2 }} />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Container>
  </Box>
);

/**
 * MenuCategorySkeleton
 */
export const MenuCategorySkeleton = () => (
  <Stack spacing={3} sx={{ py: 2 }}>
    <Skeleton width="30%" height={32} />
    <Grid container spacing={3}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Grid item xs={12} sm={6} key={i}>
          <Paper sx={{ p: 2, display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Skeleton width="60%" height={24} />
              <Skeleton width="90%" height={20} />
              <Skeleton width="30%" height={24} />
            </Box>
            <Skeleton variant="rectangular" width={100} height={100} sx={{ borderRadius: 2 }} />
          </Paper>
        </Grid>
      ))}
    </Grid>
  </Stack>
);

/**
 * ReviewSkeleton
 */
export const ReviewSkeleton = () => (
  <Stack spacing={4}>
    {Array.from({ length: 3 }).map((_, i) => (
      <Box key={i}>
        <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box>
            <Skeleton width={120} height={20} />
            <Skeleton width={80} height={16} />
          </Box>
        </Stack>
        <Skeleton width="100%" height={60} />
      </Box>
    ))}
  </Stack>
);
