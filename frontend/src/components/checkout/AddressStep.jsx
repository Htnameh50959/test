// src/components/checkout/AddressStep.jsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Step,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Home as HomeIcon,
  Work as WorkIcon,
  Place as PlaceIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { selectAddress, nextStep } from '@/redux/slices/checkoutSlice';
import AddressForm from './AddressForm';

const mockAddresses = [
  { id: 1, label: 'Home', street: '123 Maple Avenue', city: 'San Francisco', state: 'CA', zip: '94103', type: 'Home' },
  { id: 2, label: 'Work', street: '456 Tech Plaza, Suite 200', city: 'San Francisco', state: 'CA', zip: '94105', type: 'Work' },
];

const AddressStep = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { selectedAddress } = useSelector((state) => state.checkout);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleAddressChange = (event) => {
    const addr = mockAddresses.find(a => a.id.toString() === event.target.value);
    dispatch(selectAddress(addr));
  };

  const handleContinue = () => {
    if (selectedAddress) {
      dispatch(nextStep());
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} gutterBottom>
        Select Delivery Address
      </Typography>
      
      <RadioGroup value={selectedAddress?.id?.toString() || ''} onChange={handleAddressChange}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          {mockAddresses.map((addr) => (
            <Paper
              key={addr.id}
              elevation={0}
              sx={{
                p: 2,
                border: '2px solid',
                borderColor: selectedAddress?.id === addr.id ? 'primary.main' : 'divider',
                borderRadius: 3,
                bgcolor: selectedAddress?.id === addr.id ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: 'primary.light',
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <FormControlLabel
                  value={addr.id.toString()}
                  control={<Radio />}
                  label=""
                  sx={{ mr: 0 }}
                />
                <Box sx={{ flexGrow: 1, ml: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    {addr.type === 'Home' ? <HomeIcon color="primary" sx={{ fontSize: 20, mr: 1 }} /> : 
                     addr.type === 'Work' ? <WorkIcon color="primary" sx={{ fontSize: 20, mr: 1 }} /> : 
                     <PlaceIcon color="primary" sx={{ fontSize: 20, mr: 1 }} />}
                    <Typography variant="subtitle1" fontWeight={700}>
                      {addr.label}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {addr.street}, {addr.city}, {addr.state} {addr.zip}
                  </Typography>
                </Box>
                <Box>
                  <IconButton size="small" sx={{ mr: 1 }} color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </Stack>
      </RadioGroup>

      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        fullWidth
        sx={{ mt: 3, borderRadius: 3, py: 1.5, borderStyle: 'dashed', borderWidth: 2 }}
        onClick={() => setIsFormOpen(true)}
      >
        Add New Address
      </Button>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          disabled={!selectedAddress}
          onClick={handleContinue}
          sx={{ px: 6, py: 1.5, borderRadius: 3, fontWeight: 700 }}
        >
          Continue to Payment
        </Button>
      </Box>

      <AddressForm open={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </Box>
  );
};

export default AddressStep;
