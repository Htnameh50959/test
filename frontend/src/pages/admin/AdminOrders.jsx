import { useEffect, useState } from 'react';
import {
  Box, Chip, CircularProgress, Container, Divider, FormControl,
  InputLabel, MenuItem, Paper, Select, Skeleton, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography, alpha,
} from '@mui/material';
import {
  AccessTime, AttachMoney, CheckCircle, ErrorOutline,
  LocalShipping, Pending, Restaurant as RestaurantIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import AdminLayout from '@/components/layout/AdminLayout';
import api from '@/services/api';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'warning',  icon: <Pending fontSize="small" /> },
  confirmed:  { label: 'Confirmed',  color: 'info',     icon: <CheckCircle fontSize="small" /> },
  preparing:  { label: 'Preparing',  color: 'secondary', icon: <RestaurantIcon fontSize="small" /> },
  ready:      { label: 'Ready',      color: 'success',  icon: <CheckCircle fontSize="small" /> },
  picked_up:  { label: 'Picked Up',  color: 'primary',  icon: <LocalShipping fontSize="small" /> },
  delivered:  { label: 'Delivered',  color: 'success',  icon: <CheckCircle fontSize="small" /> },
  cancelled:  { label: 'Cancelled',  color: 'error',    icon: <ErrorOutline fontSize="small" /> },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/admin/orders', { params });
      setOrders(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [statusFilter]);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || o.pricing?.total || 0), 0);

  return (
    <AdminLayout>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1, mb: 0.5 }}>
          All <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Orders</Box>
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>
          View and monitor all platform orders in real-time.
        </Typography>
      </Box>

      {/* Stats */}
      <Stack direction="row" spacing={3} sx={{ mb: 4, flexWrap: 'wrap', gap: 2 }}>
        {[
          { label: 'Total Orders', value: total, color: '#E63946', icon: <AttachMoney /> },
          { label: 'Revenue (shown)', value: `₹${totalRevenue.toLocaleString()}`, color: '#2196F3', icon: <AttachMoney /> },
          { label: 'Delivered', value: orders.filter(o => o.status === 'delivered').length, color: '#4CAF50', icon: <CheckCircle /> },
          { label: 'Pending/Active', value: orders.filter(o => ['pending', 'confirmed', 'preparing', 'ready', 'picked_up'].includes(o.status)).length, color: '#FF9800', icon: <AccessTime /> },
        ].map(stat => (
          <Paper key={stat.label} elevation={0} sx={{ p: 3, borderRadius: 4, border: '1px solid', borderColor: 'divider', minWidth: 160, flex: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase' }}>{stat.label}</Typography>
            <Typography variant="h5" fontWeight={900} sx={{ color: stat.color, mt: 0.5 }}>{stat.value}</Typography>
          </Paper>
        ))}
      </Stack>

      {/* Filter */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} color="text.secondary">
          {orders.length} order{orders.length !== 1 ? 's' : ''} shown
        </Typography>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Status Filter</InputLabel>
          <Select value={statusFilter} label="Status Filter" onChange={(e) => setStatusFilter(e.target.value)} sx={{ borderRadius: 3 }}>
            <MenuItem value="">All Statuses</MenuItem>
            {Object.keys(STATUS_CONFIG).map(s => (
              <MenuItem key={s} value={s}>{STATUS_CONFIG[s].label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 800, color: 'text.secondary', bgcolor: 'grey.50', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5 } }}>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Restaurant</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton height={20} /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">No orders found</Typography>
                </TableCell>
              </TableRow>
            ) : orders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
              const customer = order.userId;
              const customerName = customer ? `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim() || customer.email : 'N/A';
              const amount = order.totalAmount || order.pricing?.total || 0;
              return (
                <TableRow key={order._id} hover sx={{ '&:hover': { bgcolor: alpha('#E63946', 0.02) } }}>
                  <TableCell>
                    <Typography variant="caption" fontFamily="monospace" fontWeight={700} color="primary.main">
                      #{String(order._id).slice(-8).toUpperCase()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} noWrap>{customerName}</Typography>
                    <Typography variant="caption" color="text.secondary">{customer?.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} noWrap>{order.restaurantId?.name || 'Unknown'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>₹{amount.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip icon={cfg.icon} label={cfg.label} color={cfg.color} size="small" sx={{ fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {order.createdAt ? format(new Date(order.createdAt), 'dd MMM, HH:mm') : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </AdminLayout>
  );
}
