import React from 'react';
import { Box, Typography, Grid, Paper, Stack, Button, IconButton } from '@mui/material';
import {
  FileDownload, FilterList, TrendingUp, Group, ShoppingCart, Star
} from '@mui/icons-material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import MerchantLayout from '@/components/layout/MerchantLayout';

const AGGREGATE_DATA = [
  { day: 'Mon', revenue: 0, orders: 0 },
  { day: 'Tue', revenue: 0, orders: 0 },
  { day: 'Wed', revenue: 0, orders: 0 },
  { day: 'Thu', revenue: 0, orders: 0 },
  { day: 'Fri', revenue: 0, orders: 0 },
  { day: 'Sat', revenue: 0, orders: 0 },
  { day: 'Sun', revenue: 0, orders: 0 },
];

export default function MerchantAnalytics() {
  return (
    <MerchantLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
        <Box>
           <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Intelligence <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Report</Box></Typography>
           <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Deep-dive into your restaurant's performance and growth.</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
           <Button variant="outlined" startIcon={<FilterList />} sx={{ borderRadius: 3, fontWeight: 800 }}>Last 30 Days</Button>
           <Button variant="contained" startIcon={<FileDownload />} sx={{ borderRadius: 10, px: 4, fontWeight: 900 }}>Export Data</Button>
        </Stack>
      </Box>

      <Grid container spacing={4}>
         {/* 1. Summary Cards */}
         <Grid xs={12} lg={6}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 8, border: '1px solid rgba(0,0,0,0.05)', minHeight: 400, height: '100%', bgcolor: 'white' }}>
               <Typography variant="h6" fontWeight={900} sx={{ mb: 4 }}>Revenue Growth</Typography>
               <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={AGGREGATE_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontWeight: 800, fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 800, fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="revenue" fill="#D85830" radius={[6, 6, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </Box>
            </Paper>
         </Grid>

         <Grid xs={12} lg={6}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 8, border: '1px solid rgba(0,0,0,0.05)', minHeight: 400, height: '100%', bgcolor: 'white' }}>
               <Typography variant="h6" fontWeight={900} sx={{ mb: 4 }}>Order Volume</Typography>
               <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={AGGREGATE_DATA}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontWeight: 800, fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontWeight: 800, fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }} />
                        <Line type="monotone" dataKey="orders" stroke="#4D7C5E" strokeWidth={4} dot={{ r: 6, fill: '#4D7C5E' }} />
                     </LineChart>
                  </ResponsiveContainer>
               </Box>
            </Paper>
         </Grid>

         <Grid xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 6, bgcolor: '#2D2926', color: 'white' }}>
               <TrendingUp sx={{ mb: 2, color: 'primary.main' }} />
               <Typography variant="caption" sx={{ display: 'block', opacity: 0.6, fontWeight: 900 }}>RETENTION RATE</Typography>
               <Typography variant="h4" fontWeight={900}>0%</Typography>
            </Paper>
         </Grid>
         <Grid xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 6, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
               <Group sx={{ mb: 2, color: 'info.main' }} />
               <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 900 }}>NEW CUSTOMERS</Typography>
               <Typography variant="h4" fontWeight={900}>0</Typography>
            </Paper>
         </Grid>
         <Grid xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 6, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
               <ShoppingCart sx={{ mb: 2, color: 'success.main' }} />
               <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 900 }}>AVG ORDER VALUE</Typography>
               <Typography variant="h4" fontWeight={900}>₹0.00</Typography>
            </Paper>
         </Grid>
         <Grid xs={12} sm={6} lg={3}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 6, bgcolor: 'white', border: '1px solid rgba(0,0,0,0.05)' }}>
               <Star sx={{ mb: 2, color: 'warning.main' }} />
               <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 900 }}>LOYALTY GROWTH</Typography>
               <Typography variant="h4" fontWeight={900}>0%</Typography>
            </Paper>
         </Grid>
      </Grid>
    </MerchantLayout>
  );
}
