import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationsService } from '@/services/notificationsService';

export const fetchNotifications = createAsyncThunk('notifications/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await notificationsService.getAll();
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to load notifications');
  }
});

export const markRead = createAsyncThunk('notifications/markRead', async (id, { rejectWithValue }) => {
  try {
    await notificationsService.markRead(id);
    return id;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to mark read');
  }
});

export const markAllRead = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try {
    await notificationsService.markAllRead();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to mark all read');
  }
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0, loading: false, error: null },
  reducers: {
    addLocalNotification: (state, action) => {
      state.items.unshift(action.payload);
      if (!action.payload.isRead) state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending,   (s) => { s.loading = true; })
      .addCase(fetchNotifications.fulfilled, (s, a) => {
        s.loading = false;
        s.items = a.payload?.data || [];
        s.unreadCount = a.payload?.unreadCount || 0;
      })
      .addCase(fetchNotifications.rejected,  (s) => { s.loading = false; })
      .addCase(markRead.fulfilled, (s, a) => {
        const n = s.items.find(x => x._id === a.payload);
        if (n && !n.isRead) { n.isRead = true; s.unreadCount = Math.max(0, s.unreadCount - 1); }
      })
      .addCase(markAllRead.fulfilled, (s) => {
        s.items.forEach(n => { n.isRead = true; });
        s.unreadCount = 0;
      });
  },
});

export const { addLocalNotification } = notificationsSlice.actions;
export const selectNotifications    = (s) => s.notifications.items;
export const selectUnreadCount      = (s) => s.notifications.unreadCount;
export const selectNotificationsLoading = (s) => s.notifications.loading;
export default notificationsSlice.reducer;
