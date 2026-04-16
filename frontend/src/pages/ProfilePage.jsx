import { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Button, TextField, Alert,
  Divider, Avatar, Grid, Chip, List, ListItem, ListItemText, Skeleton,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
  Paper, Stack
} from '@mui/material';
import {
  Edit, Add, Person, ExitToApp, Delete, Home, Work, LocationOn,
  Star, EmojiEvents, CheckCircle, Warning
} from '@mui/icons-material';
import { useFormik } from 'formik';
import { useDispatch, useSelector } from 'react-redux';

import {
  selectUser, selectAuthLoading, selectAuthError,
  fetchProfile, updateProfile, logout, clearError
} from '@/redux/slices/authSlice';
import { addToast } from '@/redux/slices/uiSlice';

import { addressSchema } from '@/utils';
import { authService } from '@/services/authService';

export default function ProfilePage() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);

  const [editMode, setEditMode] = useState(false);
  const [addrDialog, setAddrDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  const profileFormik = useFormik({
    enableReinitialize: true,
    initialValues: {
      firstName: user?.profile?.firstName ?? '',
      lastName: user?.profile?.lastName ?? '',
      phone: user?.profile?.phone ?? '',
    },
    onSubmit: async (values) => {
      try {
        await dispatch(updateProfile({ profile: values })).unwrap();
        setEditMode(false);
        dispatch(addToast({ message: 'Profile updated successfully!', severity: 'success' }));
      } catch (err) {
        dispatch(addToast({ message: err || 'Failed to update profile', severity: 'error' }));
      }
    },

  });

  const addrFormik = useFormik({
    enableReinitialize: true,
    initialValues: editingAddress
      ? {
          label: editingAddress.label,
          street: editingAddress.street,
          city: editingAddress.city,
          state: editingAddress.state,
          zipCode: editingAddress.zipCode,
        }
      : { label: '', street: '', city: '', state: '', zipCode: '' },
    validationSchema: addressSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        let newAddresses;
        if (editingAddress) {
          // Update existing
          newAddresses = user.addresses.map((a) =>
            a._id === editingAddress._id ? { ...a, ...values } : a
          );
        } else {
          // Add new
          newAddresses = [...(user?.addresses ?? []), values];
        }

        await dispatch(updateProfile({ addresses: newAddresses })).unwrap();
        setAddrDialog(false);
        setEditingAddress(null);
        resetForm();
        dispatch(addToast({ 
          message: editingAddress ? 'Address updated!' : 'New address added!', 
          severity: 'success' 
        }));
      } catch (err) {
        dispatch(addToast({ message: 'Failed to save address', severity: 'error' }));
      }
    },

  });

  const handleDeleteAddress = async (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        const newAddresses = user.addresses.filter((a) => a._id !== id);
        await dispatch(updateProfile({ addresses: newAddresses })).unwrap();
        dispatch(addToast({ message: 'Address deleted', severity: 'success' }));
      } catch (err) {
        dispatch(addToast({ message: 'Failed to delete address', severity: 'error' }));
      }
    }
  };


  const handleSetDefaultAddress = async (id) => {
    const newAddresses = user.addresses.map((a) => ({
      ...a,
      isDefault: a._id === id,
    }));
    await dispatch(updateProfile({ addresses: newAddresses }));
  };

  if (loading && !user) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 4, mb: 4 }} />
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 4 }}><Skeleton height={400} sx={{ borderRadius: 4 }} /></Grid>
          <Grid size={{ xs: 12, md: 8 }}><Skeleton height={400} sx={{ borderRadius: 4 }} /></Grid>
        </Grid>
      </Container>
    );
  }

  const initials = `${user?.profile?.firstName?.[0] ?? ''}${user?.profile?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {saveMsg && <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>{saveMsg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => dispatch(clearError())}>{error}</Alert>}

      <Grid container spacing={4}>
        {/* Left Sidebar: Profile Overview */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            <Card elevation={2} sx={{ borderRadius: 4, overflow: 'hidden' }}>
              <Box sx={{ height: 100, bgcolor: 'primary.main' }} />
              <CardContent sx={{ position: 'relative', pt: 0, textAlign: 'center' }}>
                <Avatar
                  sx={{
                    width: 100, height: 100, mx: 'auto', mt: -6, mb: 2,
                    border: '4px solid white', bgcolor: 'secondary.main',
                    fontSize: 40, fontWeight: 800
                  }}
                >
                  {initials}
                </Avatar>
                <Typography variant="h5" fontWeight={700}>
                  {user?.profile?.firstName} {user?.profile?.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user?.email}
                </Typography>
                <Chip
                  icon={<CheckCircle fontSize="small" />}
                  label="Verified Account"
                  color="success"
                  size="small"
                  sx={{ fontWeight: 600, px: 1 }}
                />
                
                <Divider sx={{ my: 3 }} />
                
                <Box display="flex" flexDirection="column" gap={1.5}>
                  <Button
                    fullWidth
                    variant={editMode ? "contained" : "outlined"}
                    startIcon={<Edit />}
                    onClick={() => setEditMode(!editMode)}
                  >
                    {editMode ? 'Finish Editing' : 'Edit Profile'}
                  </Button>
                  <Button
                    fullWidth
                    color="error"
                    startIcon={<ExitToApp />}
                    onClick={() => dispatch(logout())}
                  >
                    Sign Out
                  </Button>
                </Box>
              </CardContent>
            </Card>

            {/* Loyalty Points Card */}
            <Card elevation={2} sx={{ borderRadius: 4, bgcolor: 'primary.dark', color: 'white' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" sx={{ justifyContent: 'space-between' }}>

                  <Box>
                    <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1 }}>
                      Loyalty Points
                    </Typography>
                    <Typography variant="h3" fontWeight={800}>
                      {user?.loyaltyPoints ?? 0}
                    </Typography>
                  </Box>
                  <EmojiEvents sx={{ fontSize: 48, opacity: 0.3 }} />
                </Stack>
                <Typography variant="body2" sx={{ mt: 2, opacity: 0.9 }}>
                  You are {Math.max(0, 500 - (user?.loyaltyPoints ?? 0))} points away from a <b>free delivery!</b>
                </Typography>
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Right Content Area */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={4}>
            {/* Personal Details Section */}
            <Paper elevation={1} sx={{ p: 4, borderRadius: 4 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }} display="flex" alignItems="center">
                <Person sx={{ mr: 1.5, color: 'primary.main' }} />
                Account Settings
              </Typography>
              <Box component="form" onSubmit={profileFormik.handleSubmit}>
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth label="First Name" name="firstName"
                      disabled={!editMode}
                      value={profileFormik.values.firstName}
                      onChange={profileFormik.handleChange}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth label="Last Name" name="lastName"
                      disabled={!editMode}
                      value={profileFormik.values.lastName}
                      onChange={profileFormik.handleChange}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField fullWidth label="Email Address" value={user?.email ?? ''} disabled />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth label="Phone Number" name="phone"
                      disabled={!editMode}
                      value={profileFormik.values.phone}
                      onChange={profileFormik.handleChange}
                    />
                  </Grid>
                </Grid>
                {editMode && (
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    sx={{ mt: 3, px: 4 }}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
                  </Button>
                )}
              </Box>
            </Paper>

            {/* Address Management Section */}
            <Paper elevation={1} sx={{ p: 4, borderRadius: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>

                <Typography variant="h6" fontWeight={700} display="flex" alignItems="center">
                  <LocationOn sx={{ mr: 1.5, color: 'primary.main' }} />
                  Saved Addresses
                </Typography>
                <Button variant="contained" size="small" startIcon={<Add />} onClick={() => { setEditingAddress(null); setAddrDialog(true); }}>
                  Add New
                </Button>
              </Box>

              {user?.addresses?.length > 0 ? (
                <Stack spacing={2}>
                  {user.addresses.map((addr, i) => (
                    <Box
                      key={addr._id || i}
                      sx={{
                        p: 2, borderRadius: 3, border: '1px solid',
                        borderColor: addr.isDefault ? 'primary.light' : 'divider',
                        bgcolor: addr.isDefault ? 'rgba(230,57,70,0.02)' : 'transparent',
                        position: 'relative', overflow: 'hidden'
                      }}
                    >
                      {addr.isDefault && (
                        <Box sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'primary.main', px: 1, borderBottomLeftRadius: 8 }}>
                          <Typography variant="caption" color="white" fontWeight={700}>DEFAULT</Typography>
                        </Box>
                      )}
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>

                          <Avatar sx={{ bgcolor: 'grey.100', color: 'text.primary' }}>
                            {addr.label?.toLowerCase() === 'home' ? <Home /> : addr.label?.toLowerCase() === 'work' ? <Work /> : <LocationOn />}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>{addr.label}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {addr.street}, {addr.city}, {addr.state} {addr.zipCode}
                            </Typography>
                          </Box>
                        </Box>
                        <Box>
                          {!addr.isDefault && (
                            <Tooltip title="Set as Default">
                              <IconButton size="small" onClick={() => handleSetDefaultAddress(addr._id)}>
                                <CheckCircle fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Edit Address">
                            <IconButton size="small" onClick={() => { setEditingAddress(addr); setAddrDialog(true); }}>
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeleteAddress(addr._id)}>
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Box textAlign="center" py={4} bgcolor="grey.50" borderRadius={3}>
                  <Warning color="action" sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                  <Typography color="text.secondary">No saved addresses yet.</Typography>
                </Box>
              )}
            </Paper>
          </Stack>
        </Grid>
      </Grid>

      {/* Address Dialog */}
      <Dialog open={addrDialog} onClose={() => setAddrDialog(false)} maxWidth="xs" fullWidth scroll="paper" PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle fontWeight={700}>
          {editingAddress ? 'Edit Address' : 'Add New Address'}
        </DialogTitle>
        <Box component="form" onSubmit={addrFormik.handleSubmit}>
          <DialogContent dividers>
            <Stack spacing={3}>
              <TextField fullWidth label="Label (e.g. Home, Work)" name="label"
                value={addrFormik.values.label} onChange={addrFormik.handleChange}
                error={addrFormik.touched.label && Boolean(addrFormik.errors.label)} helperText={addrFormik.touched.label && addrFormik.errors.label} />
              
              <TextField fullWidth label="Street Address" name="street"
                value={addrFormik.values.street} onChange={addrFormik.handleChange}
                error={addrFormik.touched.street && Boolean(addrFormik.errors.street)} helperText={addrFormik.touched.street && addrFormik.errors.street} />
              
              <Stack direction="row" spacing={2}>
                <TextField fullWidth label="City" name="city"
                  value={addrFormik.values.city} onChange={addrFormik.handleChange}
                  error={addrFormik.touched.city && Boolean(addrFormik.errors.city)} helperText={addrFormik.touched.city && addrFormik.errors.city} />
                <TextField fullWidth label="State" name="state"
                  value={addrFormik.values.state} onChange={addrFormik.handleChange}
                  error={addrFormik.touched.state && Boolean(addrFormik.errors.state)} helperText={addrFormik.touched.state && addrFormik.errors.state} />
              </Stack>
              
              <TextField fullWidth label="ZIP / PIN Code" name="zipCode"
                value={addrFormik.values.zipCode} onChange={addrFormik.handleChange}
                error={addrFormik.touched.zipCode && Boolean(addrFormik.errors.zipCode)} helperText={addrFormik.touched.zipCode && addrFormik.errors.zipCode} />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={() => setAddrDialog(false)} color="inherit">Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={20} /> : 'Save Address'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
}
