import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 12, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 96, lineHeight: 1 }}>🍔</Typography>
        <Typography variant="h1" fontWeight={900} color="primary" sx={{ fontSize: { xs: 72, md: 96 }, lineHeight: 1 }}>
          404
        </Typography>
        <Typography variant="h5" fontWeight={700} mt={2} gutterBottom>Page not found</Typography>
        <Typography color="text.secondary" mb={4}>
          Looks like this page got eaten. Let&apos;s get you back to the good stuff.
        </Typography>
        <Button variant="contained" size="large" onClick={() => navigate('/')}>Back to Home</Button>
      </Box>
    </Container>
  );
}
