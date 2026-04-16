// src/theme.js — MUI theme configuration

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: '#D85830', contrastText: '#fff' }, // Burnt Orange
    secondary: { main: '#2D2926', contrastText: '#fff' }, // Deep Obsidian
    success:   { main: '#4D7C5E', contrastText: '#fff' }, // Sage Green
    error:     { main: '#BC4123' },
    warning:   { main: '#E8A855' },
    background:{ default: '#FBF9F6', paper: '#FFFFFF' }, // Creamy Off-white
    text:      { primary: '#2D2926', secondary: '#706B65' },
    divider:   'rgba(45, 41, 38, 0.08)',
  },

  spacing: 4,

  typography: {
    fontFamily: '"Outfit", "Inter", sans-serif',
    h1: { fontWeight: 900, fontSize: '3rem', letterSpacing: '-0.02em', color: '#2D2926' },
    h2: { fontWeight: 900, fontSize: '2.5rem', letterSpacing: '-0.02em' },
    h3: { fontWeight: 800, fontSize: '2rem' },
    h4: { fontWeight: 800, fontSize: '1.5rem' },
    h5: { fontWeight: 800, fontSize: '1.25rem' },
    h6: { fontWeight: 800, fontSize: '1.1rem' },
    subtitle1: { fontWeight: 600, fontSize: '1.05rem', color: '#2D2926' },
    body1: { fontSize: '1rem', lineHeight: 1.6, color: '#4A4540' },
    button: { fontWeight: 800, textTransform: 'none', letterSpacing: '0.01em' },
  },

  shape: { borderRadius: 4 },

  components: {
    MuiButton: {
      styleOverrides: {
        root: { 
          borderRadius: 8, 
          padding: '12px 28px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:active': { transform: 'scale(0.96)' }, // Click feedback
        },
        containedPrimary: { 
          background: 'linear-gradient(135deg, #D85830 0%, #F1754E 100%)',
          boxShadow: '0 4px 14px 0 rgba(216, 88, 48, 0.3)',
          '&:hover': { 
            boxShadow: '0 6px 20px rgba(216, 88, 48, 0.4)',
            transform: 'translateY(-2px)',
          } 
        },
        outlinedSecondary: {
          borderWidth: '1.5px',
          '&:hover': { borderWidth: '1.5px', bgcolor: 'rgba(45, 41, 38, 0.04)' }
        }

      },
    },
    MuiCard: {
      styleOverrides: {
        root: { 
          borderRadius: 12, 
          boxShadow: '0 10px 40px rgba(45, 41, 38, 0.05)',
          border: '1px solid rgba(45, 41, 38, 0.05)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 20px 60px rgba(45, 41, 38, 0.08)',
          }
        },

      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'medium' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            transition: 'all 0.2s ease',
            '& fieldset': { borderColor: 'rgba(45, 41, 38, 0.1)' },
            '&:hover fieldset': { borderColor: 'rgba(45, 41, 38, 0.2)' },
            '&.Mui-focused fieldset': { borderWidth: '1.5px' }
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700, borderRadius: 6 },
        sizeSmall: { fontSize: '0.7rem' }
      }
    }
  },
});

export default theme;
