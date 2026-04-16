import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  Grid,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  MenuItem as MuiMenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  Zoom,
} from '@mui/material';
import {
  Add, Edit, Delete, RestaurantMenu, Search, Fastfood, 
  Close, Inventory, Save, Warning, PhotoCamera, 
  CheckCircle, Block, MoreVert, FilterList
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

// ── Components ───────────────────────────────────────────────────────────────

const MenuItemCard = ({ item, onToggle, onEdit, onDelete }) => {
  return (
    <Zoom in style={{ transitionDelay: '50ms' }}>
      <Card 
        elevation={0} 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 6,
          border: '1px solid rgba(0,0,0,0.06)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden',
          '&:hover': { 
            transform: 'translateY(-8px)', 
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            '& .card-actions': { opacity: 1 }
          }
        }}
      >
        {/* Image Section */}
        <Box sx={{ position: 'relative', height: 180, overflow: 'hidden' }}>
          <CardMedia
            component="img"
            height="180"
            image={item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&q=80'}
            alt={item.name}
            sx={{ 
              filter: item.isAvailable ? 'none' : 'grayscale(1) contrast(0.8)',
              transition: '0.4s'
            }}
          />
          
          {/* Availability Overlay */}
          {!item.isAvailable && (
            <Box sx={{ 
              position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(2px)'
            }}>
              <Chip 
                icon={<Block sx={{ color: 'white !important' }} />} 
                label="UNAVAILABLE" 
                sx={{ bgcolor: 'rgba(0,0,0,0.8)', color: 'white', fontWeight: 900, letterSpacing: 1 }} 
              />
            </Box>
          )}

          {/* Category Badge */}
          <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
            <Chip 
              label={item.category} 
              size="small" 
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.9)', 
                backdropFilter: 'blur(4px)',
                fontWeight: 900, 
                fontSize: '0.65rem',
                border: '1px solid rgba(0,0,0,0.05)'
              }} 
            />
          </Box>

          {/* Quick Actions (Hover) */}
          <Box 
            className="card-actions"
            sx={{ 
              position: 'absolute', top: 12, right: 12, 
              display: 'flex', gap: 1, opacity: 0, transition: '0.2s'
            }}
          >
            <Tooltip title="Edit Item">
              <IconButton 
                size="small" 
                onClick={onEdit}
                sx={{ bgcolor: 'white', color: 'text.primary', '&:hover': { bgcolor: 'primary.main', color: 'white' } }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Item">
              <IconButton 
                size="small" 
                onClick={onDelete}
                sx={{ bgcolor: 'white', color: 'error.main', '&:hover': { bgcolor: 'error.main', color: 'white' } }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <CardContent sx={{ flexGrow: 1, pt: 2, pb: '16px !important' }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>

            <Typography variant="subtitle1" fontWeight={900} sx={{ lineHeight: 1.2 }}>
              {item.name}
            </Typography>
            <Typography variant="subtitle2" fontWeight={900} color="primary.main">
              {formatCurrency(item.price)}
            </Typography>
          </Stack>
          
          <Typography variant="caption" color="text.secondary" sx={{ 
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', height: 32, mb: 2, fontWeight: 500
          }}>
            {item.description || 'No description available for this item.'}
          </Typography>

          <Divider sx={{ my: 1.5, opacity: 0.5 }} />

          <Stack direction="row" alignItems="center" sx={{ justifyContent: 'space-between' }}>

            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ 
                width: 8, height: 8, borderRadius: '50%', 
                bgcolor: item.isAvailable ? 'success.main' : 'error.main',
                boxShadow: item.isAvailable ? '0 0 8px rgba(77, 124, 94, 0.5)' : 'none'
              }} />
              <Typography variant="caption" fontWeight={800} color="text.secondary">
                {item.isAvailable ? 'In stock' : 'Out of stock'}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
               <Typography variant="caption" fontWeight={900} sx={{ opacity: 0.6 }}>Live</Typography>
               <Switch 
                  size="small" 
                  checked={item.isAvailable} 
                  onChange={() => onToggle(item._id, item.isAvailable)}
                  sx={{ 
                    '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'primary.main' }
                  }}
               />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Zoom>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MerchantMenu() {
  const dispatch = useDispatch();
  const { items, byCategory, loading, error } = useSelector(selectMerchantMenu);
  
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    dispatch(fetchMerchantMenu());
  }, [dispatch]);

  const filteredItems = useMemo(() => {
    const list = activeTab === 0 ? items : (byCategory[CATEGORIES[activeTab]] || []);
    return list.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, byCategory, activeTab, searchQuery]);

  // Tab counts
  const categoryCounts = useMemo(() => {
    const counts = { All: items.length };
    CATEGORIES.slice(1).forEach(cat => {
      counts[cat] = byCategory[cat]?.length || 0;
    });
    return counts;
  }, [items, byCategory]);

  const handleOpenDialog = (item = null) => {
    setEditingItem(item);
    setImagePreview(item?.image || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setImagePreview(null);
  };

  const handleImageChange = (e, setFieldValue) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setFieldValue('image', reader.result); // In a real app, upload here and get URL
      };
      reader.readAsDataURL(file);
    }
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
      // Failed to save item
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
      // Failed to delete item
    }

  };

  const handleToggle = async (id, currentStatus) => {
    try {
      await dispatch(toggleItemAvailability({ id, isAvailable: !currentStatus })).unwrap();
    } catch (err) {
      // Failed to toggle
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
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 3, mb: 6 }}>
        <Box>
           <Typography variant="h4" fontWeight={1000} sx={{ letterSpacing: -1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
             <Fastfood color="primary" sx={{ fontSize: 36 }} />
             Kitchen <Box component="span" sx={{ color: 'primary.main', fontWeight: 400, fontStyle: 'italic' }}>Menu</Box>
           </Typography>
           <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Manage your restaurant's digital storefront and stock.</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Add />} 
          onClick={() => handleOpenDialog()}
          sx={{ 
            borderRadius: 10, px: 4, py: 1.8, fontWeight: 900, 
            boxShadow: '0 8px 32px rgba(216, 88, 48, 0.25)',
            transition: '0.3s',
            '&:hover': { transform: 'scale(1.05)', boxShadow: '0 12px 40px rgba(216, 88, 48, 0.35)' }
          }}
        >
          Add New Dish
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 4 }}>{error}</Alert>}

      {/* ── FILTER & SEARCH ───────────────────────────────────────────── */}
      <Grid container spacing={4} sx={{ mb: 6 }}>
        <Grid size={{ xs: 12, lg: 8 }}>

          <Paper 
            elevation={0} 
            sx={{ 
              borderRadius: 6, 
              border: '1px solid rgba(0,0,0,0.06)', 
              bgcolor: 'white',
              p: 1
            }}
          >
            <Tabs 
              value={activeTab} 
              onChange={(e, val) => setActiveTab(val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                '& .MuiTab-root': { 
                  fontWeight: 900, textTransform: 'none', py: 2.5, px: 3, 
                  fontSize: '0.9rem', color: 'text.secondary'
                },
                '& .Mui-selected': { color: 'primary.main !important' },
                '& .MuiTabs-indicator': { height: 4, borderRadius: 2, bgcolor: 'primary.main' }
              }}
            >
              {CATEGORIES.map((cat) => (
                <Tab 
                  key={cat} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {cat}
                      <Chip 
                        label={categoryCounts[cat]} 
                        size="small" 
                        sx={{ 
                          height: 20, fontSize: '0.65rem', fontWeight: 900, 
                          bgcolor: activeTab === CATEGORIES.indexOf(cat) ? 'primary.main' : 'rgba(0,0,0,0.05)',
                          color: activeTab === CATEGORIES.indexOf(cat) ? 'white' : 'text.primary'
                        }} 
                      />
                    </Box>
                  } 
                />
              ))}
            </Tabs>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>

          <TextField 
            fullWidth 
            placeholder="Search dish name..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
               input: { 
                  startAdornment: <InputAdornment position="start"><Search color="primary" /></InputAdornment>,
                  sx: { borderRadius: 6, bgcolor: 'white', p: 1 }
               }
            }} 
          />
        </Grid>
      </Grid>

      {/* ── GRID ──────────────────────────────────────────────────────── */}
      {filteredItems.length > 0 ? (
        <Grid container spacing={4}>
           {filteredItems.map((item) => (
             <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={item._id}>

                <MenuItemCard 
                  item={item}
                  onToggle={handleToggle}
                  onEdit={() => handleOpenDialog(item)}
                  onDelete={() => setDeleteId(item._id)}
                />
             </Grid>
           ))}
        </Grid>
      ) : (
        <Fade in>
          <Paper elevation={0} sx={{ py: 15, textAlign: 'center', borderRadius: 8, border: '2px dashed rgba(0,0,0,0.05)', bgcolor: 'transparent' }}>
            <Box sx={{ position: 'relative', display: 'inline-block', mb: 4 }}>
              <RestaurantMenu sx={{ fontSize: 100, color: 'primary.main', opacity: 0.1 }} />
              <Search sx={{ position: 'absolute', bottom: -10, right: -10, fontSize: 50, color: 'primary.main', opacity: 0.2 }} />
            </Box>
            <Typography variant="h5" fontWeight={1000} sx={{ mb: 1, letterSpacing: -0.5 }}>
              {items.length === 0 ? 'Your menu is looking empty.' : 'No matches found.'}
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={700} sx={{ mb: 5 }}>
              {items.length === 0 ? 'Start your journey by adding your signature dishes.' : 'Try adjusting your search or category filters.'}
            </Typography>
            {items.length === 0 && (
              <Button 
                variant="contained" 
                startIcon={<Add />} 
                onClick={() => handleOpenDialog()} 
                sx={{ borderRadius: 10, px: 4, py: 1.8, fontWeight: 900 }}
              >
                Create First Item
              </Button>
            )}
          </Paper>
        </Fade>
      )}

      {/* ── DIALOGS ───────────────────────────────────────────────────── */}
      
      {/* Add/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        fullWidth 
        maxWidth="sm" 
        PaperProps={{ sx: { borderRadius: 8, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 1000, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {editingItem ? 'Edit Culinary Choice' : 'Add New Dish'}
          <IconButton onClick={handleCloseDialog} size="small"><Close /></IconButton>
        </DialogTitle>
        <Formik
          initialValues={{
            name: editingItem?.name || '',
            price: editingItem?.price || '',
            category: editingItem?.category || '',
            description: editingItem?.description || '',
            image: editingItem?.image || '',
            isAvailable: editingItem?.isAvailable ?? true
          }}
          validationSchema={MenuSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ errors, touched, isSubmitting, setFieldValue }) => (
            <Form>
              <DialogContent sx={{ pt: 2 }}>
                <Stack spacing={4}>
                  {/* Image Upload Area */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Box 
                      sx={{ 
                        width: '100%', height: 200, borderRadius: 6, bgcolor: 'grey.50',
                        border: '2px dashed', borderColor: 'divider',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', position: 'relative', cursor: 'pointer',
                        transition: '0.3s',
                        '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(216, 88, 48, 0.02)' }
                      }}
                      onClick={() => document.getElementById('menu-image-upload').click()}
                    >
                      {imagePreview ? (
                        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                          <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.3)', opacity: 0, '&:hover': { opacity: 1 }, transition: '0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PhotoCamera sx={{ color: 'white', fontSize: 40 }} />
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <PhotoCamera sx={{ fontSize: 50, color: 'text.disabled', mb: 1 }} />
                          <Typography variant="body2" color="text.secondary" fontWeight={800}>Click to upload dish photo</Typography>
                          <Typography variant="caption" color="text.disabled" fontWeight={700}>JPG, PNG or WEBP (Max 2MB)</Typography>
                        </>
                      )}
                      <input 
                        id="menu-image-upload" 
                        type="file" 
                        hidden 
                        accept="image/*"
                        onChange={(e) => handleImageChange(e, setFieldValue)}
                      />
                    </Box>
                  </Box>

                  <Field
                    as={TextField}
                    name="name"
                    label="Item name"
                    fullWidth
                    error={touched.name && !!errors.name}
                    helperText={touched.name && errors.name}
                    variant="outlined"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
                  />

                  <Grid container spacing={3}>
                    <Grid size={{ xs: 6 }}>

                      <Field
                        as={TextField}
                        name="price"
                        label="Price (INR)"
                        type="number"
                        fullWidth
                        error={touched.price && !!errors.price}
                        helperText={touched.price && errors.price}
                        InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>

                      <Field
                        as={TextField}
                        name="category"
                        label="Category"
                        select
                        fullWidth
                        error={touched.category && !!errors.category}
                        helperText={touched.category && errors.category}
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
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
                    label="Description"
                    multiline
                    rows={4}
                    fullWidth
                    error={touched.description && !!errors.description}
                    helperText={touched.description && errors.description}
                    placeholder="Describe ingredients, spice levels, etc."
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 4 } }}
                  />
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 4, pt: 1 }}>
                <Button onClick={handleCloseDialog} color="inherit" sx={{ fontWeight: 900 }}>Cancel</Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  startIcon={isSubmitting ? <CircularProgress size={20} /> : <Save />} 
                  disabled={isSubmitting}
                  sx={{ borderRadius: 4, px: 6, py: 1.5, fontWeight: 900 }}
                >
                  {editingItem ? 'Update Item' : 'Add to Menu'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        PaperProps={{ sx: { borderRadius: 8, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 1000, display: 'flex', alignItems: 'center', gap: 2 }}>
           <Warning color="error" /> Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" fontWeight={700} color="text.secondary">
            Are you sure you want to remove this item? This will hide it from customers indefinitely.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button onClick={() => setDeleteId(null)} color="inherit" sx={{ fontWeight: 900 }}>Keep it</Button>
          <Button onClick={handleDelete} color="error" variant="contained" sx={{ borderRadius: 4, fontWeight: 900, px: 4 }}>Remove Dish</Button>
        </DialogActions>
      </Dialog>
    </MerchantLayout>
  );
}
