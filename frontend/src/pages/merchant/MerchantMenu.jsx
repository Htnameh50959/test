import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, Typography, Grid, Paper, Stack, Button, IconButton, Switch, Chip, 
  TextField, InputAdornment, Tab, Tabs, Dialog, DialogTitle, DialogContent, 
  DialogActions, MenuItem as MuiMenuItem, Alert, CircularProgress
} from '@mui/material';
import {
  Add, Edit, Delete, RestaurantMenu, Search, Fastfood, 
  Close, Inventory, Save, Warning
} from '@mui/icons-material';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';

import MerchantLayout from '@/components/layout/MerchantLayout';
import { 
  fetchMerchantMenu, addMenuItem, updateMenuItem, 
  deleteMenuItem, toggleItemAvailability, selectMerchantMenu 
} from '@/redux/slices/merchantSlice';
import { formatCurrency } from '@/utils/formatters';

const CATEGORIES = ['All', 'Starters', 'Main Course', 'Sides', 'Desserts', 'Beverages'];

// Validation Schema
const MenuSchema = Yup.object().shape({
  name: Yup.string().required('Name is required').min(3, 'Too short'),
  price: Yup.number().required('Price is required').min(0, 'Price cannot be negative'),
  category: Yup.string().required('Category is required'),
  description: Yup.string().max(200, 'Description too long'),
});

export default function MerchantMenu() {
  const dispatch = useDispatch();
  const { items, byCategory, loading, error } = useSelector(selectMerchantMenu);
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    dispatch(fetchMerchantMenu());
  }, [dispatch]);

  const filteredItems = useMemo(() => {
    const list = activeTab === 0 ? items : (byCategory[CATEGORIES[activeTab]] || []);
    return list.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, byCategory, activeTab, searchQuery]);

  const handleOpenDialog = (item = null) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (editingItem) {
        await dispatch(updateMenuItem({ id: editingItem._id, data: values })).unwrap();
      } else {
        await dispatch(addMenuItem(values)).unwrap();
      }
      handleCloseDialog();
    } catch (err) {
      console.error('Failed to save item:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dispatch(deleteMenuItem(deleteId)).unwrap();
      setDeleteId(null);
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await dispatch(toggleItemAvailability({ id, isAvailable: !currentStatus })).unwrap();
    } catch (err) {
      console.error('Failed to toggle availability:', err);
    }
  };

  if (loading && items.length === 0) {
    return (
      <MerchantLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 6 }}>
        <Box>
           <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Menu <Box component="span" sx={{ color: 'primary.main', fontStyle: 'italic' }}>Catalog</Box></Typography>
           <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Update your dishes, pricing, and availability.</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          onClick={() => handleOpenDialog()}
          sx={{ borderRadius: 10, px: 4, py: 1.5, fontWeight: 900 }}
        >
          Create New Item
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 4 }}>{error}</Alert>}

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
             <Grid xs={12} sm={6} lg={4} key={item._id}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    borderRadius: 6, 
                    border: '1px solid rgba(0,0,0,0.05)', 
                    bgcolor: 'white',
                    position: 'relative',
                    transition: '0.3s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 30px rgba(0,0,0,0.05)' }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                       <Chip label={item.category} size="small" sx={{ fontWeight: 900, borderRadius: 1.5 }} color="primary" variant="outlined" />
                       {!item.isAvailable && <Chip label="Out of Stock" size="small" color="error" sx={{ fontWeight: 900, borderRadius: 1.5 }} />}
                    </Box>
                    <Box>
                       <IconButton size="small" onClick={() => handleOpenDialog(item)}><Edit fontSize="small" /></IconButton>
                       <IconButton size="small" color="error" onClick={() => setDeleteId(item._id)}><Delete fontSize="small" /></IconButton>
                    </Box>
                  </Box>

                  <Typography variant="h6" fontWeight={900} sx={{ mb: 0.5 }}>{item.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, height: 40, overflow: 'hidden' }}>{item.description}</Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 2, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                    <Typography variant="subtitle1" fontWeight={900} color="primary.main">{formatCurrency(item.price)}</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                       <Typography variant="caption" fontWeight={900} color="text.secondary">Available</Typography>
                       <Switch 
                          size="small" 
                          checked={item.isAvailable} 
                          onChange={() => handleToggle(item._id, item.isAvailable)}
                       />
                    </Stack>
                  </Box>
                </Paper>
             </Grid>
           ))}
        </Grid>
      ) : (
        <Paper elevation={0} sx={{ py: 12, textAlign: 'center', borderRadius: 8, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
          <RestaurantMenu sx={{ fontSize: 80, color: 'primary.main', opacity: 0.1, mb: 3 }} />
          <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>{items.length === 0 ? 'Your kitchen is silent.' : 'No items found.'}</Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 4 }}>
            {items.length === 0 ? 'Add your first dish to start receiving orders.' : 'Try adjusting your search or filters.'}
          </Typography>
          {items.length === 0 && (
            <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()} sx={{ borderRadius: 10, px: 4, py: 1.5, fontWeight: 900 }}>Create New Item</Button>
          )}
        </Paper>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 6 } }}>
        <DialogTitle sx={{ fontWeight: 900, pb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingItem ? 'Edit Menu Item' : 'Add New Item'}
          <IconButton onClick={handleCloseDialog}><Close /></IconButton>
        </DialogTitle>
        <Formik
          initialValues={{
            name: editingItem?.name || '',
            price: editingItem?.price || '',
            category: editingItem?.category || '',
            description: editingItem?.description || '',
            isAvailable: editingItem?.isAvailable ?? true
          }}
          validationSchema={MenuSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting }) => (
            <Form>
              <DialogContent sx={{ pt: 3 }}>
                <Stack spacing={3}>
                  <Field
                    as={TextField}
                    name="name"
                    label="Dish Name"
                    fullWidth
                    error={touched.name && !!errors.name}
                    helperText={touched.name && errors.name}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Field
                        as={TextField}
                        name="price"
                        label="Price"
                        type="number"
                        fullWidth
                        error={touched.price && !!errors.price}
                        helperText={touched.price && errors.price}
                        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <Field
                        as={TextField}
                        name="category"
                        label="Category"
                        select
                        fullWidth
                        error={touched.category && !!errors.category}
                        helperText={touched.category && errors.category}
                        slotProps={{ inputLabel: { shrink: true } }}
                      >
                        {CATEGORIES.slice(1).map((cat) => (
                          <MuiMenuItem key={cat} value={cat}>{cat}</MuiMenuItem>
                        ))}
                      </Field>
                    </Grid>
                  </Grid>
                  <Field
                    as={TextField}
                    name="description"
                    label="Description (Optional)"
                    multiline
                    rows={3}
                    fullWidth
                    error={touched.description && !!errors.description}
                    helperText={touched.description && errors.description}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 3, pt: 1 }}>
                <Button onClick={handleCloseDialog} color="inherit" sx={{ fontWeight: 900 }}>Cancel</Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <Save />} 
                  disabled={isSubmitting}
                  sx={{ borderRadius: 4, px: 4, fontWeight: 900 }}
                >
                  {editingItem ? 'Update Item' : 'Create Item'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)} PaperProps={{ sx: { borderRadius: 6 } }}>
        <DialogTitle sx={{ fontWeight: 900 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography fontWeight={700}>Are you sure you want to remove this item? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDeleteId(null)} color="inherit" sx={{ fontWeight: 900 }}>Keep it</Button>
          <Button onClick={handleDelete} color="error" variant="contained" sx={{ borderRadius: 4, fontWeight: 900 }}>Delete Permanently</Button>
        </DialogActions>
      </Dialog>
    </MerchantLayout>
  );
}
