import React from 'react';
import { Box, Grid, Paper, Typography, Stack, Avatar, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme, LinearProgress, Chip } from '@mui/material';
import {
  People, Store, Receipt, Assessment, VerifiedUser, Security, TrendingUp, Notifications as NotificationsIcon
} from '@mui/icons-material';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import AdminLayout from '@/components/layout/AdminLayout';

const USER_STATS = [
  { label: 'Total Users', value: '45,280', trend: '+5.2%', icon: <People />, color: '#457B9D' },
  { label: 'Active Merchants', value: '1,240', trend: '+12%', icon: <Store />, color: '#D85830' },
  { label: 'Monthly Orders', value: '12,800', trend: '+8.4%', icon: <Receipt />, color: '#4D7C5E' },
  { label: 'Total Revenue', value: '₹84,000', trend: '+15%', icon: <Assessment />, color: '#1D3557' },
];

const PLATFORM_GROWTH = [
  { month: 'Jan', users: 4000, revenue: 2400 },
  { month: 'Feb', users: 3000, revenue: 1398 },
  { month: 'Mar', users: 2000, revenue: 9800 },
  { month: 'Apr', users: 2780, revenue: 3908 },
  { month: 'May', users: 1890, revenue: 4800 },
  { month: 'Jun', users: 2390, revenue: 3800 },
];

const PENDING_VERIFICATIONS = [
  { id: '1', name: 'Grand Hyatt Buffet', type: 'Restaurant', owner: 'Victor Wang', date: '2m ago' },
  { id: '2', name: 'Elite Bistro', type: 'Cafe', owner: 'Sarah Jenkins', date: '1h ago' },
  { id: '3', name: 'Shadow Lounge', type: 'Bar & Grill', owner: 'Michael Scott', date: '3h ago' },
];

export default function AdminDashboard() {
  const theme = useTheme();

  return (
    <AdminLayout>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.03em', mb: 0.5 }}>
            Platform <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 500, color: 'text.secondary' }}>Core Console</Box>
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Enterprise Monitoring & Merchant Verification</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
           <Button variant="outlined" startIcon={<Security />} sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}>Security Logs</Button>
           <Button variant="contained" color="primary" sx={{ borderRadius: 6, px: 4, fontWeight: 900 }}>Fast Verify Path</Button>
        </Stack>
      </Box>

      <Grid container spacing={4} alignItems="stretch">
        {/* 1. Key Metrics */}
        {USER_STATS.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.label}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid rgba(0,0,0,0.05)', height: '100%', bgcolor: 'white' }}>
               <Box sx={{ p: 1.5, bgcolor: stat.color, color: 'white', borderRadius: 3, display: 'flex' }}>{stat.icon}</Box>
               <Box>
                  <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ letterSpacing: 0.5 }}>{stat.label.toUpperCase()}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                     <Typography variant="h5" fontWeight={900}>{stat.value}</Typography>
                     <Typography variant="caption" fontWeight={900} color="success.main">{stat.trend}</Typography>
                  </Box>
               </Box>
            </Paper>
          </Grid>
        ))}

        {/* 2. Main Analytics Chart */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)', minHeight: 480, height: '100%', bgcolor: 'white' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 6 }}>
               <Typography variant="h6" fontWeight={900}>Network Growth Analytics</Typography>
               <Stack direction="row" spacing={1}>
                  <Chip label="Monthly" size="small" variant="filled" sx={{ fontWeight: 800, bgcolor: '#1D3557', color: 'white' }} />
                  <Chip label="Yearly" size="small" variant="outlined" sx={{ fontWeight: 800 }} />
               </Stack>
            </Box>
            <Box sx={{ height: 350, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={PLATFORM_GROWTH} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminColorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D3557" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#1D3557" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="adminColorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D85830" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#D85830" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontWeight: 800, fontSize: 12, fill: '#666' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 800, fontSize: 12, fill: '#666' }} />
                  <Tooltip contentStyle={{ borderRadius: 16, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', fontWeight: 800 }} />
                  <Area type="monotone" dataKey="users" stroke="#1D3557" strokeWidth={4} fillOpacity={1} fill="url(#adminColorUsers)" />
                  <Area type="monotone" dataKey="revenue" stroke="#D85830" strokeWidth={4} fillOpacity={1} fill="url(#adminColorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* 3. Verification Queue Card */}
        <Grid item xs={12} lg={4}>
           <Paper elevation={0} sx={{ p: 4, borderRadius: 5, height: '100%', bgcolor: '#2D2926', color: 'white', minHeight: 480, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 4 }}>Merchant Verification Queue</Typography>
              <Stack spacing={2.5} sx={{ flexGrow: 1, overflowY: 'auto', pr: 1, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 } }}>
                 {PENDING_VERIFICATIONS.map((item) => (
                    <Box key={item.id} sx={{ p: 2.5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', transition: '0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' } }}>
                       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Box>
                             <Typography variant="subtitle2" fontWeight={900} sx={{ lineHeight: 1.2 }}>{item.name}</Typography>
                             <Typography variant="caption" sx={{ opacity: 0.5, fontWeight: 700 }}>{item.type} • {item.date}</Typography>
                          </Box>
                          <VerifiedUser sx={{ fontSize: 18, color: '#4D7C5E' }} />
                       </Box>
                       <Typography variant="caption" sx={{ display: 'block', mb: 2, opacity: 0.7, fontWeight: 800 }}>Owner: {item.owner}</Typography>
                       <Stack direction="row" spacing={1}>
                          <Button fullWidth variant="contained" size="small" sx={{ bgcolor: 'white', color: 'black', fontWeight: 900, borderRadius: 2.5, py: 0.8, '&:hover': { bgcolor: '#f0f0f0' } }}>Approve</Button>
                          <Button fullWidth variant="outlined" size="small" sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)', fontWeight: 900, borderRadius: 2.5, py: 0.8 }}>View Docs</Button>
                       </Stack>
                    </Box>
                 ))}
              </Stack>
              <Button fullWidth sx={{ mt: 3, color: 'primary.main', fontWeight: 900 }}>VIEW ALL QUEUE →</Button>
           </Paper>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
