import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, Typography, Paper, Grid, TextField, Button, 
  Avatar, Switch, FormControlLabel, Stack, Divider, CircularProgress, Alert, IconButton
} from '@mui/material';
import { 
  Store, Description, LocalDining, Map, 
  AccessTime, PhotoCamera, Save, CheckCircle 
} from '@mui/icons-material';
import MerchantLayout from '@/components/layout/MerchantLayout';
import { fetchMerchantDashboard, updateRestaurantSettings } from '@/redux/slices/merchantSlice';
import merchantService from '@/services/merchantService';

export default function MerchantProfile() {
  const dispatch = useDispatch();
  const { data: dashboardData, loading } = useSelector((state) => state.merchant.dashboard);
  const restaurant = dashboardData?.restaurant;
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cuisineTypes: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: ''
    },
    coverImage: ''
  });
  
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!restaurant) {
      dispatch(fetchMerchantDashboard());
    } else {
      setFormData({
        name: restaurant.name || '',
        description: restaurant.description || '',
        cuisineTypes: restaurant.cuisineTypes?.join(', ') || '',
        address: {
          street: restaurant.address?.street || '',
          city: restaurant.address?.city || '',
          state: restaurant.address?.state || '',
          zipCode: restaurant.address?.zipCode || ''
        },
        coverImage: restaurant.coverImage || ''
      });
    }
  }, [restaurant, dispatch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    
    try {
      const payload = {
        ...formData,
        cuisineTypes: formData.cuisineTypes.split(',').map(c => c.trim()).filter(c => c)
      };
      
      await merchantService.updateProfile(restaurant.id, payload);
      setMsg({ type: 'success', text: 'Restaurant profile updated successfully!' });
      dispatch(fetchMerchantDashboard());
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading && !restaurant) {
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
      <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 8 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1, mb: 1 }}>
            Restaurant Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Manage your public profile and kitchen operating settings.
          </Typography>
        </Box>

        {msg.text && (
          <Alert severity={msg.type} sx={{ mb: 4, borderRadius: 3, fontWeight: 700 }}>
            {msg.text}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={4}>
            {/* 1. General Info */}
            <Grid size={{ xs: 12, md: 8 }}>

              <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)' }}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Store color="primary" /> Basic Information
                </Typography>
                
                <Stack spacing={3}>
                  <TextField 
                    fullWidth 
                    label="Restaurant Name" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    variant="outlined"
                  />
                  
                  <TextField 
                    fullWidth 
                    label="Description" 
                    name="description"
                    multiline 
                    rows={4}
                    value={formData.description}
                    onChange={handleChange}
                    helperText="Tell customers what makes your kitchen special."
                  />

                  <TextField 
                    fullWidth 
                    label="Cuisine Types" 
                    name="cuisineTypes"
                    value={formData.cuisineTypes}
                    onChange={handleChange}
                    placeholder="e.g. Italian, Pizza, Pasta"
                    helperText="Comma separated list"
                  />
                </Stack>
              </Paper>

              <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)', mt: 4 }}>
                <Typography variant="h6" fontWeight={900} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Map color="primary" /> Location & Address
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12 }}>

                    <TextField 
                      fullWidth 
                      label="Street Address" 
                      name="address.street"
                      value={formData.address.street}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>

                    <TextField 
                      fullWidth 
                      label="City" 
                      name="address.city"
                      value={formData.address.city}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>

                    <TextField 
                      fullWidth 
                      label="State" 
                      name="address.state"
                      value={formData.address.state}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>

                    <TextField 
                      fullWidth 
                      label="Zip Code" 
                      name="address.zipCode"
                      value={formData.address.zipCode}
                      onChange={handleChange}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* 2. Visuals & Status */}
            <Grid size={{ xs: 12, md: 4 }}>

              <Stack spacing={4}>
                <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)' }}>
                  <Typography variant="h6" fontWeight={900} sx={{ mb: 3 }}>Branding</Typography>
                  <Box sx={{ position: 'relative', mb: 3 }}>
                    <Box 
                      sx={{ 
                        height: 160, 
                        width: '100%', 
                        bgcolor: '#f5f5f5', 
                        borderRadius: 4, 
                        backgroundImage: formData.coverImage ? `url(${formData.coverImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {!formData.coverImage && <Store sx={{ fontSize: 60, color: 'rgba(0,0,0,0.1)' }} />}
                    </Box>
                    <IconButton 
                      sx={{ 
                        position: 'absolute', 
                        bottom: -15, 
                        right: 20, 
                        bgcolor: 'primary.main', 
                        color: 'white',
                        '&:hover': { bgcolor: 'primary.dark' }
                      }}
                    >
                      <PhotoCamera />
                    </IconButton>
                  </Box>
                  <TextField 
                    fullWidth 
                    size="small" 
                    label="Banner Image URL" 
                    name="coverImage"
                    value={formData.coverImage}
                    onChange={handleChange}
                  />
                </Paper>

                <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white' }}>
                    <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>Quick Status</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <FormControlLabel
                      control={<Switch checked={restaurant?.isOpen} color="success" disabled />}
                      label={<Typography fontWeight={700}>Kitchen Open</Typography>}
                    />
                    <FormControlLabel
                      control={<Switch checked={restaurant?.isReservationsEnabled} color="primary" disabled />}
                      label={<Typography fontWeight={700}>Dine-In Enabled</Typography>}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                      Status can be toggled via Dashboard Quick Controls.
                    </Typography>
                </Paper>

                <Button 
                  fullWidth 
                  variant="contained" 
                  size="large" 
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
                  onClick={handleSubmit}
                  disabled={saving}
                  sx={{ py: 2, borderRadius: 4, fontWeight: 900, boxShadow: '0 8px 24px rgba(216, 88, 48, 0.25)' }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </Box>
    </MerchantLayout>
  );
}
