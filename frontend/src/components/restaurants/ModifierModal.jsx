import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog, DialogContent, Box, Typography, IconButton,
  Button, RadioGroup, FormControlLabel, Radio, Checkbox, 
  TextField, Stack, Divider, useMediaQuery, useTheme, Slide
} from '@mui/material';
import { Close, Add, Remove } from '@mui/icons-material';
import { addItemToCart, setPendingItem, selectCartRestaurant, selectCartItems } from '@/redux/slices/cartSlice';
import { formatCurrency } from '@/utils/formatters';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const ModifierModal = ({ open, onClose, item, restaurantId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const dispatch = useDispatch();
  
  const currentRes = useSelector(selectCartRestaurant);
  const cartItems = useSelector(selectCartItems);

  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState('');
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [instructions, setInstructions] = useState('');

  // Reset state when opening a new item
  useEffect(() => {
    if (item && open) {
      setQuantity(1);
      setSelectedVariant(item.variants?.length ? item.variants[0]._id : '');
      setSelectedAddons([]);
      setInstructions('');
    }
  }, [item, open]);

  if (!item) return null;

  // Calculate dynamic price
  const basePrice = item.price;
  const variantPrice = item.variants?.find(v => v._id === selectedVariant)?.price || 0;
  const addonPrice = item.modifiers
    ?.filter(m => selectedAddons.includes(m._id))
    ?.reduce((sum, m) => sum + m.price, 0) || 0;
    
  const unitPrice = (variantPrice || basePrice) + addonPrice;
  const totalPrice = unitPrice * quantity;

  const handleAddonToggle = (addonId) => {
    setSelectedAddons(prev => 
      prev.includes(addonId) 
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    );
  };

  const handleAddToCart = () => {
    const payload = {
      restaurantId,
      menuItemId: item._id,
      quantity,
      selectedVariant,
      selectedModifiers: selectedAddons,
      specialInstructions: instructions
    };

    // Check for conflict
    if (currentRes?.id && currentRes.id !== restaurantId && cartItems.length > 0) {
      // Conflict: prompt user using the pending state
      dispatch(setPendingItem(payload));
      onClose();
    } else {
      // No conflict or cart is empty
      dispatch(addItemToCart(payload));
      onClose();
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      slots={{ transition: Transition }}
      slotProps={{
        paper: { sx: { borderRadius: isMobile ? 0 : 4, bgcolor: '#fbfbfb' } }
      }}
    >
      {/* Header Image */}
      {item.image && (
        <Box sx={{ position: 'relative', height: { xs: 250, sm: 300 } }}>
          <Box 
            component="img"
            loading="lazy"
            src={item.image}
            alt={item.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <IconButton 
            onClick={onClose}
            sx={{ position: 'absolute', top: 16, right: 16, bgcolor: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'white' } }}
          >
            <Close />
          </IconButton>
        </Box>
      )}

      {/* Content */}
      <DialogContent sx={{ p: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {!item.image && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 3, pb: 0 }}>
            <Typography variant="h5" fontWeight={900}>{item.name}</Typography>
            <IconButton onClick={onClose}><Close /></IconButton>
          </Box>
        )}
        
        <Box sx={{ p: 3 }}>
          {item.image && <Typography variant="h5" fontWeight={900} gutterBottom>{item.name}</Typography>}
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            {item.description}
          </Typography>
          
          <Typography variant="h6" fontWeight={800} color="primary.main" gutterBottom>
            Base Price: {formatCurrency(item.price)}
          </Typography>

          {/* Variants */}
          {item.variants?.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.03)', px: 2, py: 1, borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight={800}>Size / Variant</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ bgcolor: 'text.secondary', color: 'white', px: 1, py: 0.5, borderRadius: 1 }}>Required</Typography>
              </Box>
              <RadioGroup 
                value={selectedVariant} 
                onChange={(e) => setSelectedVariant(e.target.value)}
                sx={{ px: 2, mt: 1 }}
              >
                {item.variants.map((v) => (
                  <FormControlLabel 
                    key={v._id} 
                    value={v._id} 
                    control={<Radio />} 
                    label={
                      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1">{v.name}</Typography>
                        <Typography variant="body1" color="text.secondary">{formatCurrency(v.price)}</Typography>
                      </Box>
                    }
                    sx={{ width: '100%', m: 0, py: 0.5 }}
                  />
                ))}
              </RadioGroup>
            </Box>
          )}

          {/* Modifiers */}
          {item.modifiers?.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'rgba(0,0,0,0.03)', px: 2, py: 1, borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight={800}>Add-ons</Typography>
                <Typography variant="caption" fontWeight={700} color="text.secondary">Optional</Typography>
              </Box>
              <Stack spacing={0} sx={{ px: 2, mt: 1 }}>
                {item.modifiers.map((m) => (
                  <FormControlLabel
                    key={m._id}
                    control={
                      <Checkbox 
                        checked={selectedAddons.includes(m._id)}
                        onChange={() => handleAddonToggle(m._id)}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1">{m.name}</Typography>
                        <Typography variant="body1" color="text.secondary">+{formatCurrency(m.price)}</Typography>
                      </Box>
                    }
                    sx={{ width: '100%', m: 0, py: 0.5 }}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {/* Special Instructions */}
          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>Special Instructions</Typography>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="e.g. Extra spicy, no onions..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              slotProps={{
                input: { sx: { borderRadius: 3 } }
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      {/* Footer / Actions */}
      <Divider />
      <Box sx={{ p: 2, bgcolor: 'white', display: 'flex', gap: 2, alignItems: 'center' }}>
        {/* Quantity Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#f0f0f0', p: 0.5, borderRadius: 3 }}>
          <IconButton 
            size="small" 
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={quantity <= 1}
          >
            <Remove />
          </IconButton>
          <Typography fontWeight={800}>{quantity}</Typography>
          <IconButton 
            size="small" 
            onClick={() => setQuantity(q => q + 1)}
          >
            <Add />
          </IconButton>
        </Box>

        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={item.variants?.length > 0 && !selectedVariant}
          onClick={handleAddToCart}
          sx={{ borderRadius: 3, fontWeight: 800, py: 1.5, display: 'flex', justifyContent: 'space-between' }}
        >
          <span>Add to Cart</span>
          <span>{formatCurrency(totalPrice)}</span>
        </Button>
      </Box>
    </Dialog>
  );
};
