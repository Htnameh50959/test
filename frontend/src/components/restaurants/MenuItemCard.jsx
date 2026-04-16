import React from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  IconButton,
  Select,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { formatCurrency } from '@/utils/formatters';

export const MenuItemCard = ({ item, onSelect }) => {
  const theme = useTheme();

  return (
    <Card 
      onClick={() => onSelect(item)}
      elevation={0}
      sx={{ 
        display: 'flex', 
        p: 2.5, 
        gap: 3, 
        borderRadius: 6, 
        border: '1px solid',
        borderColor: 'rgba(0,0,0,0.06)',
        bgcolor: 'white',
        cursor: 'pointer',
        transition: '0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: '0 20px 40px rgba(216, 88, 48, 0.08)',
          transform: 'scale(1.02)'
        }
      }}
    >
      {/* Popular Badge */}
      {item.isPopular && (
        <Box 
          sx={{ 
            position: 'absolute', top: 12, right: -30, bgcolor: 'primary.main', color: 'white', 
            px: 4, py: 0.5, transform: 'rotate(45deg)', fontSize: '0.65rem', fontWeight: 900, 
            letterSpacing: 1, zIndex: 1, boxShadow: '0 4px 10px rgba(0,0,0,0.1)' 
          }}
        >
          MUST TRY
        </Box>
      )}

      {item.image && (
        <Box 
          sx={{ 
            width: { xs: 80, sm: 120 }, 
            height: { xs: 80, sm: 120 }, 
            borderRadius: 5,
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid rgba(0,0,0,0.04)'
          }}
        >
           <Box 
            component="img"
            loading="lazy"
            src={item.image}
            alt={item.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: '0.6s', '&:hover': { transform: 'scale(1.1)' } }}
          />
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="h6" fontWeight={900} noWrap sx={{ fontSize: '1.2rem', letterSpacing: -0.5 }}>
            {item.name}
          </Typography>
          <Typography variant="h6" fontWeight={900} color="primary.main">
            {formatCurrency(item.price)}
          </Typography>
        </Box>
        
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            lineHeight: 1.6,
            fontSize: '0.9rem',
            opacity: 0.8,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
          }}
        >
          {item.description}
        </Typography>

        <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
           <Typography variant="caption" fontWeight={900} color="success.main" sx={{ bgcolor: 'rgba(77,124,94,0.08)', px: 1.5, py: 0.5, borderRadius: 1 }}>
              INSTANT PREP
           </Typography>
           <IconButton 
              size="medium"
              onClick={(e) => { e.stopPropagation(); onSelect(item); }}
              sx={{ 
                bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' },
                boxShadow: '0 4px 12px rgba(216, 88, 48, 0.3)'
              }}
           >
              <Add />
           </IconButton>
        </Box>
      </Box>
    </Card>
  );
};
