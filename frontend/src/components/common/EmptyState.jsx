// src/components/common/EmptyState.jsx
import React from 'react';
import { Box, Typography, Button, Stack, alpha, useTheme } from '@mui/material';
import { 
  ShoppingBagOutlined as BagIcon,
  SearchOff as SearchIcon,
  SentimentDissatisfied as ErrorIcon,
  WifiOff as OfflineIcon
} from '@mui/icons-material';

const ICONS = {
  cart: <BagIcon sx={{ fontSize: 80 }} />,
  search: <SearchIcon sx={{ fontSize: 80 }} />,
  error: <ErrorIcon sx={{ fontSize: 80 }} />,
  offline: <OfflineIcon sx={{ fontSize: 80 }} />
};

const EmptyState = ({ 
  type = 'search', 
  title, 
  description, 
  actionLabel, 
  onAction 
}) => {
  const theme = useTheme();

  return (
    <Box 
      sx={{ 
        py: 10, 
        px: 4, 
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 400
      }}
    >
      <Box 
        sx={{ 
          color: 'text.disabled', 
          mb: 3,
          p: 3,
          borderRadius: '50%',
          bgcolor: alpha(theme.palette.grey[200], 0.5),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {ICONS[type]}
      </Box>

      <Typography variant="h5" fontWeight={900} gutterBottom>
        {title || (type === 'search' ? 'No Results Found' : 'Nothing Here Yet')}
      </Typography>
      
      <Typography 
        variant="body1" 
        color="text.secondary" 
        sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}
      >
        {description || (type === 'search' ? 'Try adjusting your filters or searching for something else.' : '')}
      </Typography>

      {actionLabel && (
        <Button
          variant="contained"
          size="large"
          onClick={onAction}
          sx={{ px: 4, py: 1.5, borderRadius: 3, fontWeight: 800 }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

export default EmptyState;
