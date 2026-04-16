// src/pages/ReservationsPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Container, Grid, Typography, Button, Paper, Stack, Divider,
  TextField, MenuItem, Chip, Avatar, Rating, Stepper, Step, StepLabel,
  Dialog, DialogContent, alpha, useTheme, CircularProgress, IconButton,
  Fade, Zoom
} from '@mui/material';
import {
  EventSeat, AccessTime, Group, CheckCircle, ArrowBack,
  Restaurant as RestaurantIcon, LocationOn, Star, Phone, Close,
  CalendarMonth, TableRestaurant, ConfirmationNumber
} from '@mui/icons-material';
import { selectCurrentRestaurant, fetchRestaurantById, createBooking } from '@/redux/slices/restaurantsSlice';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';

// ── Constants ──────────────────────────────────────────────────────────────────
const TIME_SLOTS = [
  '12:00', '12:30', '13:00', '13:30', '14:00',
  '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00',
];

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];

const STEPS = ['Select Details', 'Choose Table', 'Confirm'];

const MOCK_TABLES = [
  { id: 'T1', label: 'Window Table', capacity: 2, description: 'Cozy corner with city view', available: true, premium: false },
  { id: 'T2', label: 'Garden Booth', capacity: 4, description: 'Outdoor booth with ambient lighting', available: true, premium: false },
  { id: 'T3', label: 'Chef\'s Table', capacity: 6, description: 'Open kitchen view — an experience', available: true, premium: true },
  { id: 'T4', label: 'Private Dining', capacity: 8, description: 'Fully private room for special occasions', available: false, premium: true },
  { id: 'T5', label: 'Bar Counter', capacity: 2, description: 'Front-row cocktail bar seating', available: true, premium: false },
  { id: 'T6', label: 'Courtyard', capacity: 4, description: 'Open-air courtyard with string lights', available: true, premium: false },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

// ── Sub-components ─────────────────────────────────────────────────────────────

const TimeSlotPicker = ({ selectedTime, onSelect }) => {
  const theme = useTheme();
  const lunch = TIME_SLOTS.filter((t) => parseInt(t) < 17);
  const dinner = TIME_SLOTS.filter((t) => parseInt(t) >= 17);

  const SlotGroup = ({ label, slots }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 1, mb: 1, display: 'block' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {slots.map((time) => (
          <Box
            key={time}
            onClick={() => onSelect(time)}
            sx={{
              px: 2, py: 1, borderRadius: 3, cursor: 'pointer',
              border: '2px solid',
              borderColor: selectedTime === time ? 'primary.main' : 'divider',
              bgcolor: selectedTime === time ? alpha(theme.palette.primary.main, 0.08) : 'white',
              fontWeight: 700, fontSize: '0.9rem',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.04) },
            }}
          >
            {time}
          </Box>
        ))}
      </Box>
    </Box>
  );

  return (
    <Box>
      <SlotGroup label="LUNCH" slots={lunch} />
      <SlotGroup label="DINNER" slots={dinner} />
    </Box>
  );
};

const TableCard = ({ table, selected, onSelect, partySize }) => {
  const theme = useTheme();
  const fits = table.capacity >= partySize;
  const disabled = !table.available || !fits;

  return (
    <Paper
      elevation={0}
      onClick={() => !disabled && onSelect(table)}
      sx={{
        p: 3, borderRadius: 4, cursor: disabled ? 'not-allowed' : 'pointer',
        border: '2px solid',
        borderColor: selected ? 'primary.main' : disabled ? 'divider' : 'divider',
        bgcolor: selected
          ? alpha(theme.palette.primary.main, 0.05)
          : disabled ? alpha(theme.palette.grey[100], 0.5) : 'white',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        '&:hover': !disabled ? {
          borderColor: 'primary.main',
          transform: 'translateY(-2px)',
          boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.1)}`,
        } : {},
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TableRestaurant color={selected ? 'primary' : 'action'} />
          <Typography fontWeight={800}>{table.label}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {table.premium && <Chip label="PREMIUM" size="small" color="warning" sx={{ fontWeight: 900, fontSize: '0.6rem' }} />}
          {!table.available && <Chip label="BOOKED" size="small" color="default" sx={{ fontWeight: 900, fontSize: '0.6rem' }} />}
          {table.available && !fits && <Chip label="TOO SMALL" size="small" color="error" sx={{ fontWeight: 900, fontSize: '0.6rem' }} />}
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{table.description}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Group sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          Up to {table.capacity} guests
        </Typography>
      </Stack>
    </Paper>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ReservationsPage() {
  const { id: restaurantIdFromParams } = useParams(); // /reservations/:id
  const { state: locationState } = useLocation();     // or passed via navigation state
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const theme = useTheme();

  const restaurantFromStore = useSelector(selectCurrentRestaurant);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Determine the target restaurant
  const restaurantId = restaurantIdFromParams || locationState?.restaurantId;
  const restaurant = restaurantFromStore?._id === restaurantId ? restaurantFromStore : null;

  // Wizard state
  const [step, setStep] = useState(0);
  const [partySize, setPartySize] = useState(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selectedTable, setSelectedTable] = useState(null);
  const [specialRequest, setSpecialRequest] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  // Check if reservations are enabled
  const reservationsDisabled = restaurant && restaurant.isReservationsEnabled === false;

  // Fetch restaurant if needed
  useEffect(() => {
    if (restaurantId && (!restaurant || restaurant._id !== restaurantId)) {
      dispatch(fetchRestaurantById(restaurantId));
    }
  }, [restaurantId, dispatch]);

  // Step 1 validation
  const step1Valid = date && time && partySize > 0;
  // Step 2 validation
  const step2Valid = !!selectedTable;

  const handleNext = () => {
    if (step === 0 && step1Valid) setStep(1);
    else if (step === 1 && step2Valid) setStep(2);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleConfirm = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    setSubmitting(true);
    
    const bookingData = {
      restaurant: restaurantId,
      partySize,
      date,
      timeSlot: time,
      tableNumber: selectedTable?.label || selectedTable?.id,
      specialRequests: specialRequest,
      // occasion could be added here if we had a selector
    };

    const result = await dispatch(createBooking(bookingData));
    
    if (createBooking.fulfilled.match(result)) {
      setBookingRef(result.payload._id.slice(-6).toUpperCase());
      setConfirmed(true);
    }
    
    setSubmitting(false);
  };

  // ── Confirmation Screen ──────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <Box sx={{ minHeight: '100vh', bgcolor: '#F8F7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Fade in>
          <Paper elevation={0} sx={{ p: { xs: 4, md: 6 }, borderRadius: 6, maxWidth: 520, width: '100%', textAlign: 'center', border: '1px solid rgba(0,0,0,0.06)' }}>
            <Zoom in timeout={500}>
              <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: alpha(theme.palette.success.main, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3 }}>
                <CheckCircle sx={{ fontSize: 48, color: 'success.main' }} />
              </Box>
            </Zoom>
            <Typography variant="h4" fontWeight={900} sx={{ mb: 1 }}>Table Reserved!</Typography>
            <Typography color="text.secondary" sx={{ mb: 4 }}>
              Your booking has been confirmed. We'll send a reminder before your visit.
            </Typography>

            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: '#F1F8F4', border: '1px solid rgba(77,124,94,0.15)', mb: 4, textAlign: 'left' }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>Booking Ref</Typography>
                  <Typography fontWeight={900} color="primary.main">{bookingRef}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>Restaurant</Typography>
                  <Typography fontWeight={700}>{restaurant?.name || 'Restaurant'}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>Date</Typography>
                  <Typography fontWeight={700}>{formatDate(date)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>Time</Typography>
                  <Typography fontWeight={700}>{time}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>Table</Typography>
                  <Typography fontWeight={700}>{selectedTable?.label}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary" fontWeight={700}>Guests</Typography>
                  <Typography fontWeight={700}>{partySize}</Typography>
                </Box>
              </Stack>
            </Paper>

            <Stack spacing={2}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/')}
                sx={{ borderRadius: 4, py: 1.5, fontWeight: 900 }}
              >
                Back to Home
              </Button>
              <Button
                variant="outlined"
                onClick={() => { setConfirmed(false); setStep(0); setTime(''); setSelectedTable(null); }}
                sx={{ borderRadius: 4, py: 1.5, fontWeight: 700 }}
              >
                Make Another Reservation
              </Button>
            </Stack>
          </Paper>
        </Fade>
      </Box>
    );
  }

  // ── Main Form ────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F8F7F4' }}>
      {/* Hero Strip */}
      <Box sx={{ background: 'linear-gradient(135deg, #1D3557 0%, #2C4A7C 60%, #3D6B9C 100%)', py: { xs: 6, md: 10 }, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 80% 50%, rgba(216,88,48,0.15) 0%, transparent 60%)' }} />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ color: 'rgba(255,255,255,0.7)', mb: 3, fontWeight: 700, '&:hover': { color: 'white' } }}
          >
            Back
          </Button>
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, backdropFilter: 'blur(8px)' }}>
              <EventSeat sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h3" fontWeight={900} color="white" sx={{ letterSpacing: -1 }}>
                Reserve a Table
              </Typography>
              {restaurant && (
                <Typography color="rgba(255,255,255,0.75)" fontWeight={600}>
                  at {restaurant.name}
                </Typography>
              )}
            </Box>
          </Stack>
          <Typography color="rgba(255,255,255,0.65)" sx={{ maxWidth: 480 }}>
            Choose your date, time, and seating preference for an unforgettable dining experience.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {/* Progress Stepper */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', mb: 4 }}>
          <Stepper activeStep={step} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>
                  <Typography variant="body2" fontWeight={700}>{label}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        <Grid container spacing={4}>
          {/* Left — Form Steps */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Fade in key={step}>
              <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>

                {/* ── DISABLED STATE ────────────────────────────────────────── */}
                {reservationsDisabled && (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Box sx={{ p: 3, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 4, mb: 4, border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.1) }}>
                      <Typography variant="h5" fontWeight={900} color="error.main" sx={{ mb: 1 }}>Reservations Unavailable</Typography>
                      <Typography color="text.secondary">
                        This restaurant is currently not accepting new online reservations. Please contact them directly or check back later.
                      </Typography>
                    </Box>
                    <Button variant="outlined" onClick={() => navigate(-1)} sx={{ borderRadius: 3, fontWeight: 700 }}>
                      Return to Restaurant
                    </Button>
                  </Box>
                )}

                {/* ── STEP 0: Details ────────────────────────────────────── */}
                {step === 0 && !reservationsDisabled && (
                  <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>When are you coming?</Typography>
                    <Typography color="text.secondary" sx={{ mb: 4 }}>Select your date, time, and party size.</Typography>

                    <Stack spacing={3}>
                      {/* Party Size */}
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Group sx={{ fontSize: 18 }} /> Party Size
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                          {PARTY_SIZES.map((n) => (
                            <Box
                              key={n}
                              onClick={() => setPartySize(n)}
                              sx={{
                                width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: 3, cursor: 'pointer', fontWeight: 900, fontSize: '1rem',
                                border: '2px solid', borderColor: partySize === n ? 'primary.main' : 'divider',
                                bgcolor: partySize === n ? alpha(theme.palette.primary.main, 0.08) : 'white',
                                transition: 'all 0.2s',
                                '&:hover': { borderColor: 'primary.main' },
                              }}
                            >
                              {n}
                            </Box>
                          ))}
                        </Box>
                      </Box>

                      {/* Date */}
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarMonth sx={{ fontSize: 18 }} /> Preferred Date
                        </Typography>
                        <TextField
                          type="date"
                          fullWidth
                          value={date}
                          onChange={(e) => { setDate(e.target.value); setTime(''); }}
                          inputProps={{ min: getTodayStr() }}
                          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                        />
                      </Box>

                      {/* Time */}
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTime sx={{ fontSize: 18 }} /> Available Time Slots
                        </Typography>
                        <TimeSlotPicker selectedTime={time} onSelect={setTime} />
                      </Box>
                    </Stack>

                    <Box sx={{ mt: 5, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        size="large"
                        disabled={!step1Valid}
                        onClick={handleNext}
                        sx={{ px: 6, py: 1.8, borderRadius: 4, fontWeight: 900 }}
                      >
                        Choose a Table →
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* ── STEP 1: Table Selection ─────────────────────────────── */}
                {step === 1 && (
                  <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>Choose your table</Typography>
                    <Typography color="text.secondary" sx={{ mb: 4 }}>
                      Showing tables for {partySize} guest{partySize > 1 ? 's' : ''} on {formatDate(date)} at {time}.
                    </Typography>

                    <Stack spacing={2}>
                      {MOCK_TABLES.map((table) => (
                        <TableCard
                          key={table.id}
                          table={table}
                          selected={selectedTable?.id === table.id}
                          onSelect={setSelectedTable}
                          partySize={partySize}
                        />
                      ))}
                    </Stack>

                    <TextField
                      fullWidth
                      label="Special Requests (Optional)"
                      placeholder="e.g. Birthday celebration, wheelchair access, high chair needed"
                      multiline
                      rows={2}
                      value={specialRequest}
                      onChange={(e) => setSpecialRequest(e.target.value)}
                      sx={{ mt: 3, '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
                    />

                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <Button onClick={handleBack} sx={{ fontWeight: 700 }}>← Back</Button>
                      <Button
                        variant="contained"
                        size="large"
                        disabled={!step2Valid}
                        onClick={handleNext}
                        sx={{ px: 6, py: 1.8, borderRadius: 4, fontWeight: 900 }}
                      >
                        Review Booking →
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* ── STEP 2: Confirmation ────────────────────────────────── */}
                {step === 2 && (
                  <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>Review & Confirm</Typography>
                    <Typography color="text.secondary" sx={{ mb: 4 }}>
                      Please review your reservation details before confirming.
                    </Typography>

                    <Paper elevation={0} sx={{ p: 3, borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.03), border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.15), mb: 3 }}>
                      <Stack spacing={2.5}>
                        {[
                          { icon: <RestaurantIcon />, label: 'Restaurant', value: restaurant?.name || 'Selected Restaurant' },
                          { icon: <CalendarMonth />, label: 'Date', value: formatDate(date) },
                          { icon: <AccessTime />, label: 'Time', value: time },
                          { icon: <Group />, label: 'Guests', value: `${partySize} ${partySize === 1 ? 'person' : 'people'}` },
                          { icon: <TableRestaurant />, label: 'Table', value: `${selectedTable?.label} (up to ${selectedTable?.capacity})` },
                        ].map(({ icon, label, value }) => (
                          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ color: 'primary.main' }}>{icon}</Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
                              <Typography variant="body1" fontWeight={700}>{value}</Typography>
                            </Box>
                          </Box>
                        ))}
                        {specialRequest && (
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ color: 'primary.main' }}><ConfirmationNumber /></Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>Special Request</Typography>
                              <Typography variant="body2">{specialRequest}</Typography>
                            </Box>
                          </Box>
                        )}
                      </Stack>
                    </Paper>

                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: alpha(theme.palette.warning.main, 0.04), border: '1px solid', borderColor: alpha(theme.palette.warning.main, 0.2), mb: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        ⚠️ <strong>Please arrive within 15 minutes</strong> of your booking time. Late arrivals may result in the table being released. You can cancel or modify up to 2 hours before your reservation.
                      </Typography>
                    </Paper>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Button onClick={handleBack} sx={{ fontWeight: 700 }}>← Back</Button>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleConfirm}
                        disabled={submitting}
                        sx={{
                          px: 6, py: 2, borderRadius: 4, fontWeight: 900, fontSize: '1rem',
                          background: 'linear-gradient(135deg, #D85830 0%, #E86B40 100%)',
                          boxShadow: '0 8px 25px rgba(216,88,48,0.35)',
                          minWidth: 240,
                        }}
                      >
                        {submitting ? <CircularProgress size={22} color="inherit" /> : 'Confirm Reservation ✓'}
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
            </Fade>
          </Grid>

          {/* Right — Restaurant Info Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: { md: 'sticky' }, top: 100 }}>
              {restaurant ? (
                <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      height: 160, backgroundImage: `url(https://picsum.photos/seed/${restaurant._id}/600/300)`,
                      backgroundSize: 'cover', backgroundPosition: 'center',
                    }}
                  />
                  <Box sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight={900} sx={{ mb: 0.5 }}>{restaurant.name}</Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
                      <Star sx={{ color: 'warning.main', fontSize: 16 }} />
                      <Typography variant="body2" fontWeight={700}>{restaurant.rating?.average || '4.8'}</Typography>
                      <Typography variant="body2" color="text.secondary">• {restaurant.cuisineTypes?.join(', ')}</Typography>
                    </Stack>
                    {restaurant.address && (
                      <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mb: 2 }}>
                        <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mt: 0.2, flexShrink: 0 }} />
                        <Typography variant="body2" color="text.secondary">
                          {restaurant.address.street}, {restaurant.address.city}
                        </Typography>
                      </Stack>
                    )}
                    <Divider sx={{ mb: 2 }} />
                    <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1.5 }}>
                      OPERATING HOURS
                    </Typography>
                    <Stack spacing={0.5}>
                      {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((d) => {
                        const h = restaurant.operatingHours?.[d] || { isOpen: true, openTime: '12:00', closeTime: '22:00' };
                        return (
                          <Box key={d} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="caption" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{d.slice(0, 3)}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {h.isOpen ? `${h.openTime} – ${h.closeTime}` : 'Closed'}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                </Paper>
              ) : (
                /* Generic info card when no restaurant is pre-selected */
                <Paper elevation={0} sx={{ p: 4, borderRadius: 4, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                  <EventSeat sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                  <Typography fontWeight={900} sx={{ mb: 1 }}>Dine-In Reservations</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Book a table at your favourite restaurants and enjoy a premium dine-in experience with no wait times.
                  </Typography>
                  <Divider sx={{ my: 3 }} />
                  {[
                    { icon: '⚡', text: 'Instant confirmation' },
                    { icon: '📝', text: 'Free cancellation up to 2h before' },
                    { icon: '🎂', text: 'Special occasion requests' },
                    { icon: '💺', text: 'Choose your preferred table' },
                  ].map(({ icon, text }) => (
                    <Box key={text} sx={{ display: 'flex', gap: 1.5, mb: 1.5, textAlign: 'left' }}>
                      <Typography>{icon}</Typography>
                      <Typography variant="body2" fontWeight={600}>{text}</Typography>
                    </Box>
                  ))}
                </Paper>
              )}
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
