import React from 'react';
import { Card as MuiCard, CardContent, CardHeader, CardActions, CardMedia, Box } from '@mui/material';

/**
 * Custom Card Component
 * @param {Object} props
 * @param {string} props.title - Card header title
 * @param {string} props.subheader - Card header subheader
 * @param {string} props.image - Image URL for CardMedia
 * @param {number} props.elevation - Shadow level
 * @param {boolean} props.hoverEffect - Apply scale/shadow on hover
 */
const Card = ({ 
  children, 
  title, 
  subheader, 
  image, 
  actions, 
  elevation = 1, 
  hoverEffect = false,
  sx = {},
  ...props 
}) => {
  return (
    <MuiCard
      elevation={elevation}
      sx={{
        transition: 'transform 0.2s, box-shadow 0.2s',
        ...(hoverEffect && {
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {image && (
        <CardMedia
          component="img"
          height="140"
          image={image}
          alt={title || 'card image'}
        />
      )}
      {(title || subheader) && (
        <CardHeader title={title} subheader={subheader} />
      )}
      <CardContent>
        {children}
      </CardContent>
      {actions && (
        <CardActions>
          {actions}
        </CardActions>
      )}
    </MuiCard>
  );
};

export default Card;
