import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, Typography, Grid, Paper, Stack, Button, Avatar, Chip, 
  CircularProgress, IconButton, Tooltip, Divider
} from '@mui/material';
import {
  CalendarMonth, Person, Timer, EventAvailable, Map,
  CheckCircle, Cancel, MoreVert, AccessTime, People
} from '@mui/icons-material';
import MerchantLayout from '@/components/layout/MerchantLayout';
import { 
  fetchMerchantBookings, 
  updateMerchantBookingStatus,
  selectMerchantBookings 
} from '@/redux/slices/merchantSlice';

export default function MerchantBookings() {
  const dispatch = useDispatch();
  const { items: bookings, loading, error } = useSelector(selectMerchantBookings);

  useEffect(() => {
    dispatch(fetchMerchantBookings());
  }, [dispatch]);

  const handleStatusUpdate = (id, status) => {
    dispatch(updateMerchantBookingStatus({ id, status }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'success';
      case 'pending':   return 'warning';
      case 'cancelled': return 'error';
      case 'completed': return 'info';
      case 'no-show':   return 'default';
      default:          return 'default';
    }
  };

  // Stats calculation
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    totalGuests: bookings.reduce((sum, b) => sum + (b.partySize || 0), 0),
    capacityUtilization: 0 // Mock logic: (totalGuests / theoreticalMax) * 100
  };

  return (
    <MerchantLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
        <Box>
           <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>
             Table <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Reservations</Box>
           </Typography>
           <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
             Manage your dine-in guest list and event seatings.
           </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
           <Button variant="outlined" startIcon={<CalendarMonth />} sx={{ borderRadius: 3, fontWeight: 800 }}>
             View Calendar
           </Button>
           <Button variant="contained" color="primary" sx={{ borderRadius: 10, px: 4, fontWeight: 900 }}>
             Manual Booking
           </Button>
        </Stack>
      </Box>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>
           <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ mb: 2, display: 'block', letterSpacing: 1.5 }}>
             {loading ? 'REFRESHING...' : 'UPCOMING RESERVATIONS'}
           </Typography>
           
           {loading && bookings.length === 0 ? (
             <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
           ) : bookings.length > 0 ? (
             <Stack spacing={2}>
               {bookings.map((b) => (
                 <Paper 
                   key={b._id} 
                   elevation={0} 
                   sx={{ 
                     p: 3, 
                     borderRadius: 6, 
                     border: '1px solid rgba(0,0,0,0.05)', 
                     bgcolor: 'white',
                     transition: 'transform 0.2s',
                     '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }
                   }}
                 >
                    <Grid container alignItems="center" spacing={2}>
                      <Grid size={{ xs: 'auto' }}>
                        <Avatar 
                          src={b.customer?.profile?.avatar} 
                          sx={{ width: 56, height: 56, bgcolor: 'primary.light' }}
                        >
                          {b.customer?.profile?.firstName?.charAt(0) || <Person />}
                        </Avatar>
                      </Grid>
                      <Grid size={{ xs: true }}>
                        <Typography variant="h6" fontWeight={800}>
                          {b.customer?.profile?.firstName} {b.customer?.profile?.lastName}
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight={700}>{b.timeSlot}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <People sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2" fontWeight={700}>{b.partySize} Guests</Typography>
                          </Box>
                        </Stack>
                      </Grid>
                      <Grid size={{ xs: 'auto' }}>
                        <Chip 
                          label={b.status.toUpperCase()} 
                          size="small" 
                          color={getStatusColor(b.status)}
                          sx={{ fontWeight: 900, borderRadius: 1.5, px: 1 }}
                        />
                      </Grid>
                      <Grid size={{ xs: 'auto' }}>
                        <Divider orientation="vertical" flexItem sx={{ height: 40, mx: 1 }} />
                      </Grid>
                      <Grid size={{ xs: 'auto' }}>
                        <Stack direction="row" spacing={1}>
                          {b.status === 'pending' && (
                            <Tooltip title="Confirm">
                              <IconButton color="success" onClick={() => handleStatusUpdate(b._id, 'confirmed')}>
                                <CheckCircle />
                              </IconButton>
                            </Tooltip>
                          )}
                          {['pending', 'confirmed'].includes(b.status) && (
                            <Tooltip title="Cancel">
                              <IconButton color="error" onClick={() => handleStatusUpdate(b._id, 'cancelled')}>
                                <Cancel />
                              </IconButton>
                            </Tooltip>
                          )}
                          <IconButton size="small"><MoreVert /></IconButton>
                        </Stack>
                      </Grid>
                    </Grid>
                    {b.specialRequests && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f8f9fa', borderRadius: 3, borderLeft: '4px solid #primary.main' }}>
                        <Typography variant="caption" fontWeight={800} color="text.secondary">SPECIAL REQUESTS</Typography>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{b.specialRequests}</Typography>
                      </Box>
                    )}
                 </Paper>
               ))}
             </Stack>
           ) : (
             <Paper elevation={0} sx={{ py: 12, textAlign: 'center', borderRadius: 8, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
                <EventAvailable sx={{ fontSize: 80, color: 'primary.main', opacity: 0.1, mb: 3 }} />
                <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>No bookings yet.</Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 4 }}>
                  When customers reserve a table, they will appear here.
                </Typography>
                <Button variant="outlined" sx={{ borderRadius: 10, px: 4, py: 1.5, fontWeight: 900 }}>
                  Promote Reservations
                </Button>
             </Paper>
           )}
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
           <Paper elevation={0} sx={{ p: 4, borderRadius: 8, bgcolor: '#2D2926', color: 'white', minHeight: 400, position: 'sticky', top: 24 }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 4 }}>Floor Statistics</Typography>
              <Stack spacing={4}>
                 <Box>
                    <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 900 }}>CAPACITY UTILIZATION</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                       <Typography variant="h4" fontWeight={900}>{stats.capacityUtilization}%</Typography>
                       <Box sx={{ flexGrow: 1, height: 8, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                          <Box sx={{ width: `${stats.capacityUtilization}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 4 }} />
                       </Box>
                    </Box>
                 </Box>
                 
                 <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                       <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>CONFIRMED</Typography>
                          <Typography variant="h6" fontWeight={900}>{stats.confirmed}</Typography>
                       </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                       <Box sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>PENDING</Typography>
                          <Typography variant="h6" fontWeight={900}>{stats.pending}</Typography>
                       </Box>
                    </Grid>
                 </Grid>

                 <Box>
                    <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 900 }}>TOTAL GUESTS TODAY</Typography>
                    <Typography variant="h3" fontWeight={900} color="primary.main">{stats.totalGuests}</Typography>
                 </Box>

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
