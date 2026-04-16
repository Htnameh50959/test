import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { eventsService } from '@/services/eventsService';

export const fetchEvents = createAsyncThunk('events/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const { data } = await eventsService.getAll(params);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load events');
  }
});

export const fetchEventById = createAsyncThunk('events/fetchById', async (id, { rejectWithValue }) => {
  try {
    const { data } = await eventsService.getById(id);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load event');
  }
});

export const bookEventTickets = createAsyncThunk('events/book', async ({ id, tickets }, { rejectWithValue }) => {
  try {
    const { data } = await eventsService.book(id, tickets);
    return { id, ticketsBooked: tickets, ...data };
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Booking failed');
  }
});

const eventsSlice = createSlice({
  name: 'events',
  initialState: {
    items: [],
    current: null,
    loading: false,
    error: null,
    bookingSuccess: null,
  },
  reducers: {
    clearBookingSuccess: (state) => { state.bookingSuccess = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending,   (s) => { s.loading = true;  s.error = null; })
      .addCase(fetchEvents.fulfilled, (s, a) => { s.loading = false; s.items = a.payload || []; })
      .addCase(fetchEvents.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(fetchEventById.pending,   (s) => { s.loading = true; })
      .addCase(fetchEventById.fulfilled, (s, a) => { s.loading = false; s.current = a.payload; })
      .addCase(fetchEventById.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
      .addCase(bookEventTickets.pending,   (s) => { s.loading = true; s.error = null; })
      .addCase(bookEventTickets.fulfilled, (s, a) => { s.loading = false; s.bookingSuccess = a.payload;
        const ev = s.items.find(e => String(e._id) === String(a.payload.id));
        if (ev) ev.availableTickets -= a.payload.ticketsBooked;
      })
      .addCase(bookEventTickets.rejected,  (s, a) => { s.loading = false; s.error = a.payload; });
  },
});

export const { clearBookingSuccess, clearError } = eventsSlice.actions;
export const selectEvents = (s) => s.events.items;
export const selectCurrentEvent = (s) => s.events.current;
export const selectEventsLoading = (s) => s.events.loading;
export const selectEventsError = (s) => s.events.error;
export const selectBookingSuccess = (s) => s.events.bookingSuccess;
export default eventsSlice.reducer;
