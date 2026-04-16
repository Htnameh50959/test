import { useState, useEffect } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { 
  TrendingUp, TrendingDown, People, Store, ShowChart, CheckCircle, 
  Block, Visibility, ErrorOutlined 
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import adminService from '@/services/adminService';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [pendingMerchants, setPendingMerchants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, merchantsRes] = await Promise.all([
        adminService.getStats(),
        adminService.getMerchants()
      ]);
      setStats(statsRes.data.data);
      // Filter merchants who are NOT verified
      setPendingMerchants(merchantsRes.data.data.filter(m => !m.isVerified));
    } catch (err) {
      console.error('Failed to fetch admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    try {
      await adminService.verifyMerchant(id, { isVerified: true });
      fetchDashboardData();
    } catch (err) {
      alert('Failed to verify merchant');
    }
  };

  if (loading && !stats) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  const STAT_CARDS = [
    { title: 'Total Users', value: stats?.users || 0, trend: '+12%', up: true, icon: <People />, color: '#1D3557' },
    { title: 'Active Merchants', value: stats?.merchants || 0, trend: '+5%', up: true, icon: <Store />, color: '#457B9D' },
    { title: 'Total Listings', value: stats?.restaurants || 0, trend: '+8%', up: true, icon: <ShowChart />, color: '#A8DADC' },
    { title: 'Pending Approval', value: stats?.pending || 0, trend: stats?.pending > 5 ? '-2%' : 'Safe', up: stats?.pending <= 5, icon: <ErrorOutlined />, color: '#E63946' },
  ];

  return (
    <AdminLayout>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.03em', mb: 0.5 }}>
          Platform <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 500, color: 'text.secondary' }}>Overview</Box>
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Real-time system health and partner registration metrics.</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 6 }}>
        {STAT_CARDS.map((card, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>

            <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)', height: '100%', position: 'relative', overflow: 'hidden' }}>
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                 <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ p: 1, borderRadius: 3, bgcolor: `${card.color}15`, color: card.color }}>{card.icon}</Box>

                    <Chip 
                       icon={card.up ? <TrendingUp /> : <TrendingDown />} 
                       label={card.trend} 
                       size="small" 
                       sx={{ fontWeight: 900, bgcolor: card.up ? 'rgba(77, 124, 94, 0.1)' : 'rgba(188, 65, 35, 0.1)', color: card.up ? 'success.main' : 'error.main', '& .MuiChip-icon': { color: 'inherit' } }} 
                    />
                 </Stack>
                 <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>{card.value}</Typography>
                 <Typography variant="caption" color="text.secondary" fontWeight={800}>{card.title}</Typography>
              </Box>
              <Box sx={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.03, transform: 'scale(4)' }}>{card.icon}</Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>

          <Typography variant="h6" fontWeight={900} sx={{ mb: 3 }}>Verification Queue</Typography>
          <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)' }}>
            <Table>
              <TableHead sx={{ bgcolor: '#FBF9F6' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Merchant</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Joined</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingMerchants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary" fontWeight={700}>No merchants awaiting verification.</Typography>
                    </TableCell>
                  </TableRow>
                ) : pendingMerchants.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell>
                       <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                          <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 900 }}>{m.name[0]}</Avatar>

                          <Box>
                             <Typography variant="subtitle2" fontWeight={900}>{m.name}</Typography>
                             <Typography variant="caption" color="text.secondary" fontWeight={700}>
                               Owner: {m.merchantId?.profile?.firstName}
                             </Typography>
                          </Box>
                       </Stack>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>{new Date(m.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                       <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>

                          <Button 
                            variant="contained" 
                            color="success" 
                            size="small" 
                            onClick={() => handleVerify(m.id)}
                            sx={{ borderRadius: 3, fontWeight: 900 }}
                          >
                            Approve
                          </Button>
                          <IconButton component={Link} to="/admin/merchants" size="small"><Visibility /></IconButton>
                       </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
        
        <Grid size={{ xs: 12, lg: 4 }}>

           <Typography variant="h6" fontWeight={900} sx={{ mb: 3 }}>System Notifications</Typography>
           <Stack spacing={2}>
              {[
                { type: 'Alert', msg: 'System backup completed successfully.', time: '2m ago' },
                { type: 'Warning', msg: 'Server load exceeded 80% threshold.', time: '15m ago' },
                { type: 'Info', msg: 'New maintenance update available.', time: '1h ago' }
              ].map((notif, i) => (
                <Paper key={i} elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', bgcolor: notif.type === 'Warning' ? 'rgba(188, 65, 35, 0.03)' : 'white' }}>
                   <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>

                      <Box sx={{ mt: 0.5, p: 0.5, borderRadius: 1.5, bgcolor: notif.type === 'Warning' ? 'rgba(188, 65, 35, 0.1)' : 'rgba(0,0,0,0.05)' }}>
                         {notif.type === 'Warning' ? <ErrorOutlined color="error" sx={{ fontSize: 16 }} /> : <CheckCircle color="success" sx={{ fontSize: 16 }} />}
                      </Box>
                      <Box>
                         <Typography variant="subtitle2" fontWeight={900}>{notif.msg}</Typography>
                         <Typography variant="caption" color="text.secondary" fontWeight={700}>{notif.time}</Typography>
                      </Box>
                   </Stack>
                </Paper>
              ))}
              <Button fullWidth variant="outlined" sx={{ borderRadius: 3, fontWeight: 800, mt: 1 }}>Clear All Events</Button>
           </Stack>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
