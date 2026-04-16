import React from 'react';
import { Box, Typography, Button, Container, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home as HomeIcon, ChevronLeft as BackIcon } from '@mui/icons-material';

/**
 * Premium 404 Page
 * Features glassmorphism, floating micro-interactions, and high-impact typography.
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 20% 20%, rgba(216, 88, 48, 0.05) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255, 107, 107, 0.05) 0%, transparent 40%)',
        bgcolor: '#FBF9F6',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Background Decorative Element */}
      <Box 
        component={motion.div}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        sx={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(216, 88, 48, 0.03) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
        <Box 
          component={motion.div}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          sx={{ textAlign: 'center' }}
        >
          {/* Floating Burger Icon */}
          <Box
            component={motion.div}
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            sx={{ fontSize: { xs: 80, md: 120 }, mb: -2, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.1))' }}
          >
            🍔
          </Box>

          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '120px', md: '180px' },
              fontWeight: 900,
              lineHeight: 1,
              background: 'linear-gradient(135deg, #2D3436 0%, #636E72 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: -10,
              mb: 2
            }}
          >
            404
          </Typography>

          <Typography 
            variant="h4" 
            fontWeight={900} 
            sx={{ mb: 2, color: 'text.primary', letterSpacing: -1 }}
          >
            Oops! This page is off the menu.
          </Typography>

          <Typography 
            variant="body1" 
            color="text.secondary" 
            sx={{ mb: 6, maxWidth: 400, mx: 'auto', fontWeight: 500, lineHeight: 1.6 }}
          >
            It looks like this link has expired or never existed. Don't worry, our kitchen is still open!
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="large"
              startIcon={<BackIcon />}
              onClick={() => navigate(-1)}
              sx={{ 
                borderRadius: 4, 
                px: 4, 
                py: 1.5,
                fontWeight: 800,
                borderColor: 'divider',
                '&:hover': { bgcolor: 'white', borderColor: 'text.primary' }
              }}
            >
              Go Back
            </Button>
            
            <Button
              variant="contained"
              size="large"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              sx={{ 
                borderRadius: 4, 
                px: 4, 
                py: 1.5,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                boxShadow: '0 10px 30px rgba(255, 107, 107, 0.3)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 15px 40px rgba(255, 107, 107, 0.4)',
                }
              }}
            >
              Back to Home
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
