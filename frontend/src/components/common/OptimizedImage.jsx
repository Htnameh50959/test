// src/components/common/OptimizedImage.jsx
import React, { useState, useEffect } from 'react';
import { Box, alpha, useTheme } from '@mui/material';

/**
 * OptimizedImage Component
 * Features:
 * - Lazy Loading using native loading="lazy" attribute
 * - Blur placeholder for smooth transition
 * - Aspect ratio support
 * - Modern WebP format with JPG fallback (via logic if provided)
 */
const OptimizedImage = ({ 
  src, 
  alt, 
  aspectRatio = '16/9', 
  borderRadius = 0,
  objectFit = 'cover',
  className = '',
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <Box 
      className={`shimmer ${className}`}
      sx={{ 
        position: 'relative', 
        width: '100%', 
        paddingTop: `calc(1 / (${aspectRatio.split('/').join(' / ')}) * 100%)`,
        overflow: 'hidden',
        borderRadius,
        bgcolor: 'grey.100',
        isolation: 'isolate',
        '&.shimmer::after': {
          display: isLoaded ? 'none' : 'block'
        }
      }}
    >
      {/* Actual Image */}
      <Box
        component="img"
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit,
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 2,
          transform: isLoaded ? 'scale(1)' : 'scale(1.03)',
          willChange: 'opacity, transform'
        }}
        {...props}
      />
    </Box>
  );
};

export default OptimizedImage;
