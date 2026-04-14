import React, { useState } from 'react';
import { Box, Typography, Grid, Paper, Stack, Button, IconButton, Switch, Chip, TextField, InputAdornment, Tab, Tabs } from '@mui/material';
import {
  Add, Edit, Delete, RestaurantMenu, FilterList, Search, Fastfood, LocalBar, Icecream, LunchDining
} from '@mui/icons-material';
import MerchantLayout from '@/components/layout/MerchantLayout';

const CATEGORIES = ['All', 'Starters', 'Main Course', 'Sides', 'Desserts', 'Beverages'];

const MENU_ITEMS = []; // Cleared mock data for fresh registration state

export default function MerchantMenu() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = MENU_ITEMS.filter(item => {
    const matchesCategory = activeTab === 0 || item.category === CATEGORIES[activeTab];
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <MerchantLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 6 }}>
        <Box>
           <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Menu <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Catalog</Box></Typography>
           <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Update your dishes, pricing, and availability.</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 10, px: 4, py: 1.5, fontWeight: 900 }}>Create New Item</Button>
      </Box>

      <Stack spacing={3} sx={{ mb: 6 }}>
         <Grid container spacing={2} alignItems="center">
            <Grid xs={12} md={8}>
               <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
                  <Tabs 
                     value={activeTab} 
                     onChange={(e, val) => setActiveTab(val)}
                     variant="scrollable"
                     scrollButtons="auto"
                     sx={{ 
                       px: 2, 
                       '& .MuiTab-root': { fontWeight: 900, textTransform: 'none', py: 2 },
                       '& .MuiTabs-indicator': { height: 3, borderRadius: 1 }
                     }}
                  >
                     {CATEGORIES.map((cat) => <Tab key={cat} label={cat} />)}
                  </Tabs>
               </Paper>
            </Grid>
            <Grid xs={12} md={4}>
               <TextField 
                  fullWidth 
                  placeholder="Seach item name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  slotProps={{
                     input: { 
                        startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                        sx: { borderRadius: 4, bgcolor: 'white' }
                     }
                  }} 
               />
            </Grid>
         </Grid>
      </Stack>

      {filteredItems.length > 0 ? (
        <Grid container spacing={4}>
           {filteredItems.map((item) => (
              <Grid xs={12} sm={6} lg={4} key={item.id}>
              {/* Card Rendering */}
             </Grid>
          ))}
      </Grid>
      ) : (
        <Paper elevation={0} sx={{ py: 12, textAlign: 'center', borderRadius: 8, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
          <RestaurantMenu sx={{ fontSize: 80, color: 'primary.main', opacity: 0.1, mb: 3 }} />
          <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>Your kitchen is silent.</Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 4 }}>Add your first dish to start receiving orders.</Typography>
          <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 10, px: 4, py: 1.5, fontWeight: 900 }}>Create New Item</Button>
        </Paper>
      )}
    </MerchantLayout>
  );
}
