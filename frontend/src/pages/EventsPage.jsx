import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Container,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Grid, IconButton, Paper, Skeleton, Stack, Tab, Tabs, Typography,
  alpha, useTheme,
} from '@mui/material';
import {
  CalendarMonth, Close, ConfirmationNumber, EventAvailable,
  Groups, LocalDining, MusicNote, SportsBar, Star,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { fetchEvents, bookEventTickets, clearBookingSuccess, clearError, selectEvents, selectEventsLoading, selectBookingSuccess, selectEventsError } from '@/redux/slices/eventsSlice';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';
import { useNavigate } from 'react-router-dom';

const EVENT_TYPE_LABELS = { DINE_IN: 'Dine-In', EVENT_TICKET: 'Event', TABLE_BOOKING: 'Reservation' };
const CATEGORY_ICONS = { DINE_IN: <LocalDining />, EVENT_TICKET: <MusicNote />, TABLE_BOOKING: <EventAvailable /> };
const CATEGORY_COLORS = { DINE_IN: '#E63946', EVENT_TICKET: '#7C3AED', TABLE_BOOKING: '#0891B2' };

const EventCard = ({ event, onBook }) => {
  const theme = useTheme();
  const sold = event.totalTickets - event.availableTickets;
  const pct = Math.round((sold / event.totalTickets) * 100);
  const color = CATEGORY_COLORS[event.type] || theme.palette.primary.main;
  const icon = CATEGORY_ICONS[event.type] || <Star />;
  const daysUntil = formatDistanceToNow(new Date(event.date), { addSuffix: true });

  return (
    <Paper elevation={0} sx={{ borderRadius: 5, overflow: 'hidden', border: '1px solid', borderColor: 'divider', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 32px rgba(0,0,0,0.1)' } }}>
      <Box sx={{ height: 8, bgcolor: color }} />
      <Box sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
          <Chip icon={icon} label={EVENT_TYPE_LABELS[event.type]} size="small" sx={{ bgcolor: alpha(color, 0.1), color, fontWeight: 700, '& .MuiChip-icon': { color } }} />
          {event.availableTickets <= 5 && event.availableTickets > 0 && (
            <Chip label={`Only ${event.availableTickets} left!`} color="error" size="small" />
          )}
          {event.availableTickets === 0 && <Chip label="Sold Out" color="default" size="small" />}
        </Stack>

        <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5, lineHeight: 1.2 }}>{event.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 38, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{event.description}</Typography>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarMonth sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {format(new Date(event.date), 'EEE, dd MMM yyyy • h:mm a')}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Groups sx={{ fontSize: 15, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">{event.restaurantId?.name || 'Venue TBD'}</Typography>
          </Stack>
        </Stack>

        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">{sold} / {event.totalTickets} booked</Typography>
            <Typography variant="caption" fontWeight={700} color={pct >= 80 ? 'error.main' : 'text.secondary'}>{pct}%</Typography>
          </Stack>
          <Box sx={{ height: 4, bgcolor: 'grey.100', borderRadius: 2 }}>
            <Box sx={{ height: 4, bgcolor: pct >= 80 ? 'error.main' : color, borderRadius: 2, width: `${pct}%`, transition: 'width 1s' }} />
          </Box>
        </Box>

        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="text.secondary">per ticket</Typography>
            <Typography variant="h6" fontWeight={800} color={color}>
              {event.pricePerTicket === 0 ? 'FREE' : `₹${event.pricePerTicket.toLocaleString()}`}
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            disabled={event.availableTickets === 0}
            onClick={() => onBook(event)}
            sx={{ borderRadius: 3, fontWeight: 800, bgcolor: color, '&:hover': { bgcolor: color, opacity: 0.9 }, px: 2.5 }}
          >
            {event.availableTickets === 0 ? 'Sold Out' : `Book Now`}
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{daysUntil}</Typography>
      </Box>
    </Paper>
  );
};

const EventSkeleton = () => (
  <Paper elevation={0} sx={{ borderRadius: 5, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
    <Skeleton height={8} sx={{ transform: 'none' }} />
    <Box sx={{ p: 3 }}>
      <Skeleton width="40%" height={24} sx={{ mb: 1 }} />
      <Skeleton width="80%" height={28} sx={{ mb: 1 }} />
      <Skeleton width="100%" height={40} sx={{ mb: 2 }} />
      <Skeleton width="60%" height={20} sx={{ mb: 0.5 }} />
      <Skeleton width="50%" height={20} sx={{ mb: 2 }} />
      <Skeleton width="100%" height={36} sx={{ mb: 1, borderRadius: 2 }} />
      <Stack direction="row" justifyContent="space-between">
        <Skeleton width="30%" height={44} />
        <Skeleton width="30%" height={36} sx={{ borderRadius: 3 }} />
      </Stack>
    </Box>
  </Paper>
);

export default function EventsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const events = useSelector(selectEvents);
  const loading = useSelector(selectEventsLoading);
  const error = useSelector(selectEventsError);
  const bookingSuccess = useSelector(selectBookingSuccess);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [tab, setTab] = useState('ALL');
  const [bookingEvent, setBookingEvent] = useState(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => { dispatch(fetchEvents()); }, [dispatch]);

  const filtered = tab === 'ALL' ? events : events.filter(e => e.type === tab);

  const handleBook = (event) => {
    if (!isAuthenticated) { navigate('/login'); return; }
    setBookingEvent(event);
    setTicketCount(1);
    dispatch(clearBookingSuccess());
  };

  const confirmBooking = async () => {
    setBookingLoading(true);
    await dispatch(bookEventTickets({ id: bookingEvent._id, tickets: ticketCount }));
    setBookingLoading(false);
  };

  const handleCloseModal = () => {
    setBookingEvent(null);
    dispatch(clearBookingSuccess());
    dispatch(clearError());
  };

  const tabs = [
    { value: 'ALL', label: 'All Events', icon: <Star fontSize="small" /> },
    { value: 'EVENT_TICKET', label: 'Live Events', icon: <MusicNote fontSize="small" /> },
    { value: 'DINE_IN', label: "Chef's Table", icon: <LocalDining fontSize="small" /> },
    { value: 'TABLE_BOOKING', label: 'Reservations', icon: <EventAvailable fontSize="small" /> },
  ];

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Hero */}
      <Box sx={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', color: 'white', pt: 10, pb: 8 }}>
        <Container maxWidth="lg">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Avatar sx={{ bgcolor: '#7C3AED', width: 48, height: 48 }}><ConfirmationNumber /></Avatar>
            <Chip label="Live Discovery" sx={{ bgcolor: alpha('#7C3AED', 0.3), color: 'white', fontWeight: 700, border: '1px solid rgba(124,58,237,0.5)' }} />
          </Stack>
          <Typography variant="h2" fontWeight={900} sx={{ mb: 2, letterSpacing: '-0.03em' }}>
            Experiences &{' '}
            <Box component="span" sx={{ color: '#C084FC' }}>Live Events</Box>
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.7, maxWidth: 540, fontWeight: 400 }}>
            Jazz nights, chef's table dinners, wine tastings & more. Book your next extraordinary dining experience.
          </Typography>

          <Stack direction="row" spacing={3} sx={{ mt: 4 }}>
            {[['🎵', 'Live Music'], ['🍷', 'Wine Tasting'], ['👨‍🍳', "Chef's Table"], ['🍽️', 'Prix Fixe']].map(([emoji, label]) => (
              <Stack key={label} direction="row" spacing={0.5} alignItems="center">
                <Typography>{emoji}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>{label}</Typography>
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 5 }}>
        {/* Category Tabs */}
        <Paper elevation={0} sx={{ mb: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
            sx={{ '& .MuiTab-root': { fontWeight: 700, py: 2, px: 3 }, '& .MuiTabs-indicator': { height: 3 } }}>
            {tabs.map(t => (
              <Tab key={t.value} value={t.value} label={t.label} icon={t.icon} iconPosition="start" />
            ))}
          </Tabs>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => dispatch(clearError())}>{error}</Alert>
        )}

        {/* Stats bar */}
        <Stack direction="row" spacing={3} sx={{ mb: 4 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {loading ? '...' : `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`} available
          </Typography>
        </Stack>

        <Grid container spacing={3}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
                  <EventSkeleton />
                </Grid>
              ))
            : filtered.length === 0
            ? (
              <Grid size={{ xs: 12 }}>
                <Paper elevation={0} sx={{ p: 8, textAlign: 'center', borderRadius: 5, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="h1" sx={{ mb: 2 }}>🎭</Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>No events in this category</Typography>
                  <Typography color="text.secondary">Check back soon for upcoming experiences</Typography>
                  <Button variant="outlined" sx={{ mt: 3, borderRadius: 3 }} onClick={() => setTab('ALL')}>View All Events</Button>
                </Paper>
              </Grid>
            )
            : filtered.map(event => (
              <Grid key={event._id} size={{ xs: 12, sm: 6, lg: 4 }}>
                <EventCard event={event} onBook={handleBook} />
              </Grid>
            ))
          }
        </Grid>
      </Container>

      {/* Booking Modal */}
      <Dialog open={!!bookingEvent} onClose={handleCloseModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 5 } }}>
        {bookingEvent && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" fontWeight={800}>Book Tickets</Typography>
                <IconButton onClick={handleCloseModal} size="small"><Close /></IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent dividers>
              {bookingSuccess ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Typography variant="h2" sx={{ mb: 2 }}>🎉</Typography>
                  <Typography variant="h5" fontWeight={800} color="success.main" sx={{ mb: 1 }}>Booking Confirmed!</Typography>
                  <Typography color="text.secondary" sx={{ mb: 2 }}>
                    {bookingSuccess.ticketsBooked} ticket{bookingSuccess.ticketsBooked > 1 ? 's' : ''} booked for <strong>{bookingEvent.name}</strong>
                  </Typography>
                  <Chip label={`${bookingSuccess.remainingTickets} tickets remaining`} color="info" />
                </Box>
              ) : (
                <Stack spacing={3} sx={{ py: 1 }}>
                  <Box>
                    <Typography variant="h6" fontWeight={800}>{bookingEvent.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{bookingEvent.restaurantId?.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {format(new Date(bookingEvent.date), 'EEEE, dd MMMM yyyy • h:mm a')}
                    </Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>Number of Tickets</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {Array.from({ length: Math.min(6, bookingEvent.availableTickets) }, (_, i) => i + 1).map(n => (
                        <Box key={n} onClick={() => setTicketCount(n)} sx={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, border: '2px solid', borderColor: ticketCount === n ? 'primary.main' : 'divider', bgcolor: ticketCount === n ? 'primary.main' : 'transparent', color: ticketCount === n ? 'white' : 'text.primary', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>
                          {n}
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontWeight={700}>Total</Typography>
                    <Typography variant="h6" fontWeight={800} color="primary.main">
                      {bookingEvent.pricePerTicket === 0 ? 'FREE' : `₹${(bookingEvent.pricePerTicket * ticketCount).toLocaleString()}`}
                    </Typography>
                  </Stack>
                </Stack>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2.5 }}>
              {bookingSuccess ? (
                <Button fullWidth variant="contained" onClick={handleCloseModal} sx={{ borderRadius: 3, py: 1.5 }}>Done</Button>
              ) : (
                <>
                  <Button onClick={handleCloseModal} sx={{ borderRadius: 3 }}>Cancel</Button>
                  <Button variant="contained" onClick={confirmBooking} disabled={bookingLoading} sx={{ borderRadius: 3, px: 4 }}>
                    {bookingLoading ? <CircularProgress size={20} color="inherit" /> : `Confirm ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}`}
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
