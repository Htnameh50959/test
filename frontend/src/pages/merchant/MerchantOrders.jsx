import { useEffect, useState, useCallback } from 'react';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, Divider,
  Grid, IconButton, Paper, Skeleton, Stack, Tab, Tabs, Tooltip,
  Typography, alpha, useTheme,
} from '@mui/material';
import {
  CheckCircle, DoneAll, History, LocalPhone, MoreVert,
  Refresh, RoomService, ShoppingBag, Timer,
} from '@mui/icons-material';
import { format } from 'date-fns';
import MerchantLayout from '@/components/layout/MerchantLayout';
import { useSelector } from 'react-redux';
import api from '@/services/api';

const STATUS_TABS = [
  { key: 'all',       label: 'All',       statuses: null },
  { key: 'pending',   label: 'New',        statuses: ['pending', 'confirmed'] },
  { key: 'preparing', label: 'Preparing',  statuses: ['preparing'] },
  { key: 'ready',     label: 'Ready',      statuses: ['ready_for_pickup', 'ready'] },
  { key: 'delivered', label: 'Completed',  statuses: ['delivered'] },
];

const STATUS_CONFIG = {
  pending:           { label: 'New',       color: 'warning',  bg: '#FFF3E0' },
  confirmed:         { label: 'Confirmed', color: 'info',     bg: '#E3F2FD' },
  preparing:         { label: 'Preparing', color: 'secondary', bg: '#F3E5F5' },
  ready_for_pickup:  { label: 'Ready',     color: 'success',  bg: '#E8F5E9' },
  ready:             { label: 'Ready',     color: 'success',  bg: '#E8F5E9' },
  picked_up:         { label: 'Picked Up', color: 'primary',  bg: '#E8EAF6' },
  delivered:         { label: 'Delivered', color: 'success',  bg: '#E8F5E9' },
  cancelled:         { label: 'Cancelled', color: 'error',    bg: '#FFEBEE' },
};

const NEXT_STATUS = {
  pending:  { label: 'Accept & Prepare', next: 'preparing' },
  confirmed: { label: 'Start Preparing', next: 'preparing' },
  preparing: { label: 'Mark Ready', next: 'ready_for_pickup' },
};

const OrderCard = ({ order, onStatusUpdate }) => {
  const theme = useTheme();
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const nextAction = NEXT_STATUS[order.status];
  const [updating, setUpdating] = useState(false);
  const amount = order.pricing?.total || order.totalAmount || 0;

  const handleUpdate = async () => {
    if (!nextAction) return;
    setUpdating(true);
    try {
      await api.patch(`/orders/${order._id}/status`, { status: nextAction.next });
      onStatusUpdate(order._id, nextAction.next);
    } catch (err) {
      console.error('Status update failed', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Paper elevation={0} sx={{ borderRadius: 4, border: '2px solid', borderColor: alpha(theme.palette[cfg.color]?.main || '#E63946', 0.2), bgcolor: cfg.bg, mb: 2, overflow: 'hidden', transition: 'all 0.2s' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2, pb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: 13, fontWeight: 800 }}>
            #{String(order._id).slice(-4).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" fontWeight={800}>
              {order.userId?.profile?.firstName} {order.userId?.profile?.lastName || ''}
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Timer sx={{ fontSize: 11, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {order.createdAt ? format(new Date(order.createdAt), 'h:mm a') : '—'}
              </Typography>
            </Stack>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 800 }} />
          <Typography variant="subtitle1" fontWeight={800} color="primary.main">₹{amount.toLocaleString()}</Typography>
        </Stack>
      </Stack>

      <Divider sx={{ mx: 2 }} />

      {/* Items */}
      <Box sx={{ px: 2, py: 1.5 }}>
        {(order.items || []).map((item, idx) => (
          <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 0.4 }}>
            <Typography variant="body2">
              <Box component="span" fontWeight={700}>{item.quantity}×</Box> {item.name || item.menuItemId?.name || 'Item'}
            </Typography>
            <Typography variant="body2" color="text.secondary">₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</Typography>
          </Stack>
        ))}
        {order.specialInstructions && (
          <Box sx={{ mt: 1, p: 1, bgcolor: alpha('#FF9800', 0.1), borderRadius: 2 }}>
            <Typography variant="caption" color="warning.dark" fontWeight={700}>📝 {order.specialInstructions}</Typography>
          </Box>
        )}
      </Box>

      {/* Action */}
      {nextAction && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Button fullWidth variant="contained" size="small" onClick={handleUpdate} disabled={updating}
            sx={{ borderRadius: 3, fontWeight: 800, py: 1, bgcolor: theme.palette[cfg.color]?.main }}>
            {updating ? <CircularProgress size={16} color="inherit" /> : nextAction.label}
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default function MerchantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const loadOrders = useCallback(async () => {
    setError(null);
    try {
      const { data } = await api.get('/orders?role=merchant');
      setOrders(data.data || data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleStatusUpdate = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
  };

  const handleRefresh = () => {
    setLoading(true);
    setLastRefresh(Date.now());
    loadOrders();
  };

  const currentTab = STATUS_TABS[tab];
  const filtered = currentTab.statuses
    ? orders.filter(o => currentTab.statuses.includes(o.status))
    : orders;

  const getCount = (tab) => {
    if (!tab.statuses) return orders.length;
    return orders.filter(o => tab.statuses.includes(o.status)).length;
  };

  const pendingCount = orders.filter(o => ['pending', 'confirmed'].includes(o.status)).length;

  return (
    <MerchantLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>
              Live <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Orders</Box>
            </Typography>
            {pendingCount > 0 && (
              <Chip label={`${pendingCount} new!`} color="error" size="small" sx={{ fontWeight: 800, animation: 'pulse 1s infinite' }} />
            )}
          </Stack>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
            Auto-refreshes every 30s. Last updated: {format(new Date(lastRefresh), 'h:mm:ss a')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Refresh now">
            <IconButton onClick={handleRefresh} sx={{ bgcolor: 'white', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<History />} sx={{ borderRadius: 3, fontWeight: 800 }}>History</Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>{error}</Alert>}

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { label: "Today's Revenue", value: `₹${orders.filter(o => o.status === 'delivered').reduce((s, o) => s + (o.pricing?.total || o.totalAmount || 0), 0).toLocaleString()}` },
          { label: 'Active Orders', value: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length },
          { label: 'Completed', value: orders.filter(o => o.status === 'delivered').length },
          { label: 'Cancelled', value: orders.filter(o => o.status === 'cancelled').length },
        ].map(stat => (
          <Grid key={stat.label} size={{ xs: 6, md: 3 }}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid', borderColor: 'divider', textAlign: 'center', bgcolor: 'white' }}>
              <Typography variant="h5" fontWeight={900} color="primary.main">{stat.value}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>{stat.label}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper elevation={0} sx={{ mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden', bgcolor: 'white' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ '& .MuiTab-root': { fontWeight: 900, fontSize: '0.82rem', py: 2 }, '& .MuiTabs-indicator': { height: 3, borderRadius: 2 } }}>
          {STATUS_TABS.map((t, i) => (
            <Tab key={t.key} label={`${t.label} (${getCount(t)})`} />
          ))}
        </Tabs>
      </Paper>

      {/* Orders */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <Paper key={i} elevation={0} sx={{ p: 3, mb: 2, borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
            <Skeleton height={24} width="40%" sx={{ mb: 1 }} />
            <Skeleton height={20} width="80%" sx={{ mb: 1 }} />
            <Skeleton height={20} width="60%" />
          </Paper>
        ))
      ) : filtered.length === 0 ? (
        <Paper elevation={0} sx={{ py: 10, textAlign: 'center', borderRadius: 5, border: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
          <ShoppingBag sx={{ fontSize: 64, color: 'grey.200', mb: 2 }} />
          <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
            {tab === 0 ? 'Kitchen is quiet 🍽️' : 'No orders in this category'}
          </Typography>
          <Typography variant="body2" color="text.secondary">New orders appear here automatically every 30 seconds.</Typography>
          <Button variant="outlined" startIcon={<Refresh />} onClick={handleRefresh} sx={{ mt: 3, borderRadius: 3, fontWeight: 800 }}>
            Refresh Now
          </Button>
        </Paper>
      ) : (
        <Box>
          {filtered.map(order => (
            <OrderCard key={order._id} order={order} onStatusUpdate={handleStatusUpdate} />
          ))}
        </Box>
      )}
    </MerchantLayout>
  );
}
