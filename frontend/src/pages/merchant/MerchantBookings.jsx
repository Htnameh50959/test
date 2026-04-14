import React from 'react';
import { Box, Typography, Grid, Paper, Stack, Button, Avatar, Chip, Badge } from '@mui/material';
import {
  CalendarMonth, Person, Timer, EventAvailable, Map
} from '@mui/icons-material';
import MerchantLayout from '@/components/layout/MerchantLayout';

const BOOKINGS = []; // Cleared mock data for fresh registration state

export default function MerchantBookings() {
  return (
    <MerchantLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
        <Box>
           <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Table <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Reservations</Box></Typography>
           <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Manage your dine-in guest list and event seatings.</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
           <Button variant="outlined" startIcon={<CalendarMonth />} sx={{ borderRadius: 3, fontWeight: 800 }}>View Calendar</Button>
           <Button variant="contained" color="primary" sx={{ borderRadius: 10, px: 4, fontWeight: 900 }}>Manual Booking</Button>
        </Stack>
      </Box>

      <Grid container spacing={4}>
        <Grid xs={12} lg={8}>
           <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ mb: 2, display: 'block', letterSpacing: 1.5 }}>UPCOMING TODAY</Typography>
           
           {BOOKINGS.length > 0 ? (
             <Stack spacing={2}>
               {BOOKINGS.map((b) => (
                 <Paper key={b.id} elevation={0} sx={{ p: 4, borderRadius: 6, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
                    {/* Booking Content Rendering */}
                 </Paper>
               ))}
             </Stack>
           ) : (
             <Paper elevation={0} sx={{ py: 12, textAlign: 'center', borderRadius: 8, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
                <EventAvailable sx={{ fontSize: 80, color: 'primary.main', opacity: 0.1, mb: 3 }} />
                <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>No bookings yet.</Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 4 }}>When customers reserve a table, they will appear here.</Typography>
                <Button variant="outlined" sx={{ borderRadius: 10, px: 4, py: 1.5, fontWeight: 900 }}>Promote Reservations</Button>
             </Paper>
           )}
        </Grid>

        <Grid xs={12} lg={4}>
           <Paper elevation={0} sx={{ p: 4, borderRadius: 8, bgcolor: '#2D2926', color: 'white', minHeight: 400 }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 4 }}>Floor Statistics</Typography>
              <Stack spacing={4}>
                 <Box>
                    <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 900 }}>CAPACITY UTILIZATION</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                       <Typography variant="h4" fontWeight={900}>0%</Typography>
                       <Box sx={{ flexGrow: 1, height: 8, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                          <Box sx={{ width: '0%', height: '100%', bgcolor: 'primary.main', borderRadius: 4 }} />
                       </Box>
                    </Box>
                 </Box>
                 
                 <Grid container spacing={2}>
                    <Grid xs={6}>
                       <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>WALK-INS</Typography>
                          <Typography variant="h6" fontWeight={900}>0</Typography>
                       </Box>
                    </Grid>
                    <Grid xs={6}>
                       <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>NO-SHOWS</Typography>
                          <Typography variant="h6" fontWeight={900}>0</Typography>
                       </Box>
                    </Grid>
                 </Grid>

                 <Button fullWidth variant="contained" startIcon={<Map />} sx={{ py: 2, borderRadius: 4, bgcolor: 'white', color: 'black', fontWeight: 900, '&:hover': { bgcolor: '#f0f0f0' } }}>
                    Interactive Floor Plan
                 </Button>
              </Stack>
           </Paper>
        </Grid>
      </Grid>
    </MerchantLayout>
  );
}
