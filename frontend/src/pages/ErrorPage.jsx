import { Box, Typography, Button, Paper, Container, Stack } from '@mui/material';
import { WarningAmber, Refresh, Home } from '@mui/icons-material';
import { useRouteError, useNavigate } from 'react-router-dom';

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  console.error(error);

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: '#FBF9F6',
        p: 3 
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={0} 
          sx={{ 
            p: 6, 
            textAlign: 'center', 
            borderRadius: 8, 
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.02)'
          }}
        >
          <Box sx={{ mb: 4 }}>
             <WarningAmber sx={{ fontSize: 80, color: 'primary.main', opacity: 0.8 }} />
          </Box>
          <Typography variant="h4" fontWeight={900} sx={{ mb: 2, letterSpacing: -1 }}>
             Unexpected <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Interruption</Box>
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 6, fontWeight: 700 }}>
             Our servers encountered a kinetic glitch. Don't worry, your data is safe.
          </Typography>
          
          <Box sx={{ p: 2, bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 3, mb: 6, textAlign: 'left' }}>
             <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'error.main' }}>
                {error?.message || error?.statusText || 'Unknown System Error'}
             </Typography>
          </Box>

          <Stack direction="row" spacing={2} justifyContent="center">
             <Button 
                variant="contained" 
                startIcon={<Refresh />} 
                onClick={() => window.location.reload()}
                sx={{ borderRadius: 10, px: 4, py: 1.5, fontWeight: 900 }}
             >
                Retry
             </Button>
             <Button 
                variant="outlined" 
                startIcon={<Home />} 
                onClick={() => navigate('/')}
                sx={{ borderRadius: 10, px: 4, py: 1.5, fontWeight: 900 }}
             >
                Go Home
             </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
