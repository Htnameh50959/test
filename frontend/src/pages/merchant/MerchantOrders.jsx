import React, { useState } from 'react';
import { Box, Typography, Stack, Tab, Tabs, Grid, Paper, Chip, Avatar, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton } from '@mui/material';
import {
  MoreVert, ShoppingBag, LocalPhone, RoomService, DoneAll, History
} from '@mui/icons-material';
import MerchantLayout from '@/components/layout/MerchantLayout';

const ORDERS = []; // Cleared mock data for fresh registration state

export default function MerchantOrders() {
  const [tab, setTab] = useState(0);

  const getStatusColor = (status) => {
    switch(status) {
      case 'Pending': return 'warning';
      case 'In Kitchen': return 'info';
      case 'Ready': return 'success';
      default: return 'default';
    }
  };

  return (
    <MerchantLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 6 }}>
        <Box>
           <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Live <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Orders</Box></Typography>
           <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Manage your incoming and active kitchen tickets.</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
           <Button variant="outlined" startIcon={<History />} sx={{ borderRadius: 3, fontWeight: 800 }}>Order History</Button>
        </Stack>
      </Box>

      {ORDERS.length > 0 ? (
        <>
          <Paper elevation={0} sx={{ mb: 4, borderRadius: 3, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
            <Tabs 
              value={tab} 
              onChange={(e, val) => setTab(val)}
              sx={{ 
                px: 2, 
                '& .MuiTab-root': { fontWeight: 900, fontSize: '0.85rem', py: 2.5, minWidth: 120 },
                '& .MuiTabs-indicator': { height: 3, borderRadius: 1 }
              }}
            >
              <Tab label="All Orders (0)" />
              <Tab label="Pending (0)" />
              <Tab label="Current (0)" />
              <Tab label="Ready (0)" />
            </Tabs>
          </Paper>

          <Grid container spacing={3}>
            {ORDERS.map((order) => (
              <Grid xs={12} key={order.id}>
                {/* Order Rendering */}
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <Paper elevation={0} sx={{ py: 12, textAlign: 'center', borderRadius: 8, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
           <ShoppingBag sx={{ fontSize: 80, color: 'primary.main', opacity: 0.1, mb: 3 }} />
           <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>Kitchen is quiet.</Typography>
           <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 4 }}>New orders will appear here automatically in real-time.</Typography>
           <Button variant="outlined" startIcon={<RoomService />} sx={{ borderRadius: 10, px: 4, py: 1.5, fontWeight: 900 }}>Simulate Order</Button>
        </Paper>
      )}
    </MerchantLayout>
  );
}
