import React from 'react';
import { Box, Grid, Paper, Typography, Stack, LinearProgress, Avatar, Chip, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, useTheme } from '@mui/material';
import {
  TrendingUp, Star, MonetizationOn, Timer, MoreHoriz, Notifications as NotificationsIcon
} from '@mui/icons-material';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import MerchantLayout from '@/components/layout/MerchantLayout';

const STATS = [
  { label: 'Active Orders', value: '0', trend: '0%', icon: <TrendingUp />, color: '#D85830' },
  { label: 'Today Rating', value: '0.0', trend: '0', icon: <Star />, color: '#4D7C5E' },
  { label: 'Total Revenue', value: '₹0', trend: '0%', icon: <MonetizationOn />, color: '#2D2926' },
  { label: 'Avg Prep Time', value: '0m', trend: '0m', icon: <Timer />, color: '#5A3E2B' },
];

const REVENUE_DATA = [
  { name: '8am', value: 0 },
  { name: '10am', value: 0 },
  { name: '12pm', value: 0 },
  { name: '2pm', value: 0 },
  { name: '4pm', value: 0 },
  { name: '6pm', value: 0 },
  { name: '8pm', value: 0 },
];

const ORDER_DISTRIBUTION = [
  { name: 'Delivery', value: 0, color: '#D85830' },
  { name: 'Dine-in', value: 0, color: '#2D2926' },
  { name: 'Pick-up', value: 0, color: '#4D7C5E' },
];

const INCOMING_ORDERS = [];

import { Link } from 'react-router-dom';

export default function MerchantDashboard() {
  const theme = useTheme();
  
  // Logic: In a real app, we'd check if the merchant has a menu or orders
  // For now, we'll implement a 'Fresh Start' view for new registrations
  const isNewMerchant = true; // Simulating a fresh registration for the user's test

  if (isNewMerchant) {
    return (
      <MerchantLayout>
        <Box sx={{ py: 6 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 8, 
              borderRadius: 8, 
              textAlign: 'center', 
              bgcolor: 'white', 
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.02)'
            }}
          >
            <Box sx={{ mb: 4 }}>
               <Box component="img" src="https://cdni.iconscout.com/illustration/premium/thumb/chef-cooking-food-2527763-2117435.png" sx={{ height: 200, opacity: 0.8 }} />
            </Box>
            <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: -1, mb: 1 }}>
               Welcome to the <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Kinetic Fleet</Box>
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 6, fontWeight: 500, maxWidth: 600, mx: 'auto' }}>
               Your account has been successfully registered. Let's get your kitchen online and ready for orders.
            </Typography>

            <Grid container spacing={3} sx={{ maxWidth: 900, mx: 'auto' }}>
               {[
                 { title: 'Build Your Menu', desc: 'Add your first dishes and set pricing.', icon: '🍽️', action: '/merchant/menu' },
                 { title: 'Business Profile', desc: 'Set your hours and location.', icon: '📍', action: '/merchant/dashboard' },
                 { title: 'Verification', desc: 'Upload documents for Admin approval.', icon: '📜', action: '#' },
               ].map((step, i) => (
                 <Grid item xs={12} md={4} key={i}>
                    <Paper 
                      elevation={0} 
                      component={Link}
                      to={step.action}
                      sx={{ 
                        p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)', height: '100%', 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', 
                        transition: '0.3s', textDecoration: 'none', color: 'inherit',
                        '&:hover': { transform: 'translateY(-8px)', borderColor: 'primary.main', boxShadow: '0 12px 30px rgba(0,0,0,0.05)' }
                      }}
                    >
                       <Typography variant="h3" sx={{ mb: 2 }}>{step.icon}</Typography>
                       <Typography variant="subtitle1" fontWeight={900} sx={{ mb: 1 }}>{step.title}</Typography>
                       <Typography variant="caption" color="text.secondary" fontWeight={700}>{step.desc}</Typography>
                    </Paper>
                 </Grid>
               ))}
            </Grid>
          </Paper>
        </Box>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Box sx={{ pb: 8 }}>
        {/* 1. Stats Row — Optimized to not stretch with the next row */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {STATS.map((stat) => (
            <Grid item xs={12} sm={6} lg={3} key={stat.label}>
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white' }}>
                 <Box sx={{ p: 1.2, bgcolor: stat.color, color: 'white', borderRadius: 3, display: 'flex' }}>
                    {stat.icon}
                 </Box>
                 <Box>
                    <Typography variant="caption" fontWeight={900} color="text.secondary" sx={{ letterSpacing: 0.5, fontSize: '0.65rem' }}>{stat.label.toUpperCase()}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                       <Typography variant="h5" fontWeight={900} sx={{ fontSize: '1.4rem' }}>{stat.value}</Typography>
                       <Typography variant="caption" fontWeight={900} color={stat.trend.startsWith('+') ? 'success.main' : 'error.main'} sx={{ fontSize: '0.7rem' }}>
                          {stat.trend}
                       </Typography>
                    </Box>
                 </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* 2. Charts Row */}
        <Grid container spacing={4} alignItems="stretch">
          <Grid item xs={12} lg={8}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)', height: '100%', minHeight: 400, bgcolor: 'white' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 6 }}>
                 <Typography variant="h6" fontWeight={900}>Revenue Stream</Typography>
                 <Button size="small" sx={{ fontWeight: 900, borderRadius: 2 }}>DAILY VIEW →</Button>
              </Box>
              <Box sx={{ height: 300, width: '100%' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D85830" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#D85830" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#666' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#666' }} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', fontWeight: 800 }} />
                      <Area type="monotone" dataKey="value" stroke="#D85830" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 5, height: '100%', bgcolor: '#2D2926', color: 'white', display: 'flex', flexDirection: 'column', minHeight: 400 }}>
               <Typography variant="h6" fontWeight={900} sx={{ mb: 4 }}>Customer Sentiment</Typography>
               <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                 <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.2, justifyContent: 'center', mb: 3 }}>
                    <Chip size="small" label="Authentic" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800 }} />
                    <Chip size="small" label="Great Vibe" sx={{ bgcolor: '#D85830', color: 'white', fontWeight: 900, transform: 'scale(1.1)' }} />
                    <Chip size="small" label="Slow Service" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800 }} />
                    <Chip size="small" label="Flavorful" sx={{ bgcolor: '#4D7C5E', color: 'white', fontWeight: 900 }} />
                    <Chip size="small" label="Premium" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800 }} />
                 </Box>
                 <Box sx={{ mt: 'auto' }}>
                    <Typography variant="caption" sx={{ opacity: 0.6, fontWeight: 900, letterSpacing: 1 }}>SENTIMENT INDEX</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                       <Typography variant="h4" fontWeight={900}>88%</Typography>
                       <LinearProgress variant="determinate" value={88} sx={{ flex: 1, height: 8, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#4D7C5E', borderRadius: 4 } }} />
                    </Box>
                 </Box>
               </Box>
            </Paper>
          </Grid>

          {/* 3. Orders & Distribution Row */}
          <Grid item xs={12} lg={8}>
             <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)', height: '100%', bgcolor: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                   <Typography variant="h6" fontWeight={900}>Incoming Orders</Typography>
                   <Stack direction="row" spacing={1}>
                      <Button variant="text" size="small" sx={{ fontWeight: 800, color: 'text.secondary' }}>Dine-in</Button>
                      <Button variant="contained" size="small" sx={{ borderRadius: 2, fontWeight: 900, px: 3, boxShadow: 'none' }}>Delivery</Button>
                   </Stack>
                </Box>
                <TableContainer>
                   <Table size="small">
                      <TableHead>
                         <TableRow>
                            <TableCell sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '0.7rem' }}>ID</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '0.7rem' }}>CUSTOMER</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '0.7rem' }}>ITEMS</TableCell>
                            <TableCell sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '0.7rem' }}>TOTAL</TableCell>
                            <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 900, fontSize: '0.7rem' }}>ACTION</TableCell>
                         </TableRow>
                      </TableHead>
                      <TableBody>
                         {INCOMING_ORDERS.map((order) => (
                            <TableRow key={order.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                               <TableCell sx={{ fontWeight: 900 }}>#{order.id}</TableCell>
                               <TableCell sx={{ fontWeight: 800 }}>{order.customer}</TableCell>
                               <TableCell sx={{ fontWeight: 500, color: 'text.secondary', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.items}</TableCell>
                               <TableCell sx={{ fontWeight: 900 }}>{order.total}</TableCell>
                               <TableCell align="right">
                                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                                     <Button variant="contained" color="success" size="small" sx={{ borderRadius: 2, fontWeight: 900, boxShadow: 'none' }}>Accept</Button>
                                     <Button variant="outlined" color="error" size="small" sx={{ borderRadius: 2, fontWeight: 900 }}>Reject</Button>
                                  </Stack>
                               </TableCell>
                            </TableRow>
                         ))}
                      </TableBody>
                   </Table>
                </TableContainer>
             </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
             <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)', height: '100%', display: 'flex', flexDirection: 'column', bgcolor: 'white' }}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 4 }}>Order Distribution</Typography>
                <Box sx={{ height: 220, position: 'relative', mb: 3 }}>
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie data={ORDER_DISTRIBUTION} innerRadius={65} outerRadius={90} paddingAngle={10} dataKey="value" stroke="none">
                            {ORDER_DISTRIBUTION.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                         </Pie>
                         <Tooltip />
                      </PieChart>
                   </ResponsiveContainer>
                   <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <Typography variant="h4" fontWeight={900}>0</Typography>
                      <Typography variant="caption" color="text.secondary" fontWeight={900}>TOTAL</Typography>
                   </Box>
                </Box>
                <Stack spacing={1.5} sx={{ mt: 'auto' }}>
                   {ORDER_DISTRIBUTION.map((item) => (
                      <Box key={item.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.2, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.03)' }}>
                         <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: item.color }} />
                            <Typography variant="body2" fontWeight={800} sx={{ fontSize: '0.85rem' }}>{item.name}</Typography>
                         </Stack>
                         <Typography variant="body2" fontWeight={900} sx={{ fontSize: '0.85rem' }}>{item.value}%</Typography>
                      </Box>
                   ))}
                </Stack>
             </Paper>
          </Grid>
        </Grid>
      </Box>
    </MerchantLayout>
  );
}
