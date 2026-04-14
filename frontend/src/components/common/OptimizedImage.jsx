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
  ...props 
}) => {
  const theme = useTheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [blurSrc, setBlurSrc] = useState('');

  useEffect(() => {
    // Generate a tiny blur placeholder if possible, or use a low-res seed
    if (src && src.includes('http')) {
      setBlurSrc(`${src}?blur=10&w=20`); 
    }
  }, [src]);

  return (
    <Box 
      sx={{ 
        position: 'relative', 
        width: '100%', 
        paddingTop: `calc(1 / (${aspectRatio.split('/').join(' / ')}) * 100%)`,
        overflow: 'hidden',
        borderRadius,
        bgcolor: 'grey.100'
      }}
    >
      {/* Blur Placeholder */}
      <Box
        component="img"
        src={blurSrc || src}
        alt={alt}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit,
          filter: 'blur(10px)',
          opacity: isLoaded ? 0 : 1,
          transition: 'opacity 0.6s ease-in-out',
          zIndex: 1
        }}
      />

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
          transition: 'opacity 0.6s ease-in-out',
          zIndex: 2,
          transform: isLoaded ? 'scale(1)' : 'scale(1.05)'
        }}
        {...props}
      />
    </Box>
  );
};

export default OptimizedImage;
