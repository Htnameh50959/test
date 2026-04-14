// src/components/reviews/ReviewCard.jsx
import React, { useState } from 'react';
import {
  Box, Typography, Paper, Avatar, Rating, Stack, 
  IconButton, ImageList, ImageListItem, Chip, 
  Divider, LinearProgress, alpha, useTheme
} from '@mui/material';
import {
  ThumbUpOutlined as LikeIcon,
  ThumbUp as LikedIcon,
  Verified as VerifiedIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { formatRelativeTime } from '@/utils/formatters';

const ReviewCard = ({ review }) => {
  const theme = useTheme();
  const [helpful, setHelpful] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount || 0);

  const handleHelpful = () => {
    if (!helpful) {
      setHelpful(true);
      setHelpfulCount(c => c + 1);
      // API call to reviewsService.markHelpful(review.id) would go here
    }
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        borderRadius: 4, 
        border: '1px solid', 
        borderColor: 'divider',
        transition: '0.2s',
        '&:hover': { borderColor: 'primary.light', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Avatar 
            src={review.user?.avatar} 
            sx={{ width: 48, height: 48, bgcolor: 'primary.main', fontSize: '1.2rem', fontWeight: 800 }}
          >
            {review.user?.firstName?.[0] || 'U'}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight={800}>
              {review.user?.firstName} {review.user?.lastName}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Rating value={review.rating} readOnly size="small" />
              <Typography variant="caption" color="text.secondary">
                • {formatRelativeTime(review.createdAt)}
              </Typography>
            </Box>
          </Box>
        </Box>
        {review.verified && (
          <Chip
            size="small"
            icon={<CheckIcon sx={{ fontSize: '10px !important' }} />}
            label="Verified Purchase"
            sx={{ 
              height: 20, 
              fontSize: '0.65rem', 
              fontWeight: 800, 
              bgcolor: alpha(theme.palette.success.main, 0.1), 
              color: 'success.dark',
              border: 'none'
            }}
          />
        )}
      </Box>

      <Typography variant="body2" sx={{ mb: 2, lineHeight: 1.6, color: 'text.primary' }}>
        {review.text}
      </Typography>

      {/* Category Ratings Mini Bars */}
      {review.categoryRatings && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
          {Object.entries(review.categoryRatings).map(([key, val]) => (
            <Box key={key} sx={{ minWidth: 80 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5, textTransform: 'uppercase' }}>
                {key}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(val / 5) * 100} 
                sx={{ height: 4, borderRadius: 2, bgcolor: alpha(theme.palette.divider, 0.5) }} 
              />
            </Box>
          ))}
        </Box>
      )}

      {/* Photo Gallery */}
      {review.photos?.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <ImageList sx={{ m: 0, borderRadius: 3, overflow: 'hidden' }} cols={Math.min(review.photos.length, 4)} rowHeight={120} gap={8}>
            {review.photos.map((photo, i) => (
              <ImageListItem key={i}>
                <img
                  src={photo}
                  alt={`Review attachment ${i+1}`}
                  loading="lazy"
                  style={{ borderRadius: 8, objectFit: 'cover', height: '100%', cursor: 'pointer' }}
                />
              </ImageListItem>
            ))}
          </ImageList>
        </Box>
      )}

      <Divider sx={{ mb: 1, opacity: 0.6 }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton 
          size="small" 
          onClick={handleHelpful}
          color={helpful ? 'primary' : 'default'}
          sx={{ transition: '0.2s' }}
        >
          {helpful ? <LikedIcon fontSize="small" /> : <LikeIcon fontSize="small" />}
        </IconButton>
        <Typography variant="caption" fontWeight={700} color={helpful ? 'primary.main' : 'text.secondary'}>
          {helpfulCount} people found this helpful
        </Typography>
      </Box>
    </Paper>
  );
};

export default ReviewCard;
