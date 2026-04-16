// src/components/cart/CartConflictModal.jsx
// Shows a rich warning when the user tries to add an item from a different restaurant.
// Displays a preview of existing cart items so the user knows what they'll lose.

import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Slide,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  WarningAmber as WarningIcon,
  Restaurant as RestaurantIcon,
  ArrowForward as ArrowIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

import {
  clearPendingItem,
  clearCartAndAdd,
  clearCartAndAddLocal,
  selectCartRestaurant,
  selectCartItems,
  selectPendingItem,
} from '@/redux/slices/cartSlice';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';
import { formatCurrency } from '@/utils/formatters';

// Slide-up transition for the dialog
const SlideTransition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// ── Cart Item Mini Preview ─────────────────────────────────────────────────────

function CartItemPreview({ item }) {
  const theme = useTheme();
  const unitPrice = (item.price || 0) + (item.modifiers ?? []).reduce((s, m) => s + (m.price || 0), 0);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 0.75,
      }}
    >
      <Avatar
        src={item.image}
        variant="rounded"
        sx={{
          width: 36,
          height: 36,
          bgcolor: alpha(theme.palette.grey[500], 0.12),
          fontSize: '1rem',
          borderRadius: 1.5,
          flexShrink: 0,
        }}
      >
        {!item.image && '🍽️'}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {item.name}
        </Typography>
        {item.modifiers?.length > 0 && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {item.modifiers.map((m) => m.name).join(', ')}
          </Typography>
        )}
      </Box>

      <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ flexShrink: 0 }}>
        ×{item.quantity}
      </Typography>

      <Typography variant="body2" fontWeight={600} sx={{ flexShrink: 0, minWidth: 60, textAlign: 'right' }}>
        {formatCurrency(unitPrice * (item.quantity || 1))}
      </Typography>
    </Box>
  );
}

// ── Restaurant Transition Badge ───────────────────────────────────────────────

function RestaurantTransition({ fromName, toName }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: 1.5,
        px: 2,
        bgcolor: alpha(theme.palette.warning.main, 0.06),
        borderRadius: 2,
        border: '1px solid',
        borderColor: alpha(theme.palette.warning.main, 0.2),
        mb: 2.5,
      }}
    >
      <Chip
        icon={<RestaurantIcon sx={{ fontSize: 14 }} />}
        label={fromName || 'Current restaurant'}
        size="small"
        sx={{
          bgcolor: alpha(theme.palette.error.main, 0.1),
          color: 'error.dark',
          fontWeight: 700,
          fontSize: '0.72rem',
        }}
      />

      <ArrowIcon sx={{ color: 'text.disabled', fontSize: 18 }} />

      <Chip
        icon={<RestaurantIcon sx={{ fontSize: 14 }} />}
        label={toName || 'New restaurant'}
        size="small"
        sx={{
          bgcolor: alpha(theme.palette.success.main, 0.1),
          color: 'success.dark',
          fontWeight: 700,
          fontSize: '0.72rem',
        }}
      />
    </Box>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

export function CartConflictModal() {
  const dispatch         = useDispatch();
  const pendingItem      = useSelector(selectPendingItem);
  const currentRestaurant = useSelector(selectCartRestaurant);
  const currentItems     = useSelector(selectCartItems);
  const isAuthenticated  = useSelector(selectIsAuthenticated);
  const theme            = useTheme();

  const open = Boolean(pendingItem);

  // Show at most 3 items in the preview; add a "+N more" label
  const previewItems = currentItems.slice(0, 3);
  const extraCount   = Math.max(0, currentItems.length - 3);

  const handleCancel = () => dispatch(clearPendingItem());

  const handleClearAndAdd = () => {
    if (!pendingItem) return;

    if (isAuthenticated) {
      // Authenticated: server call clears Redis cart and adds new item
      dispatch(clearCartAndAdd(pendingItem));
    } else {
      // Guest: local-only operation
      dispatch(clearCartAndAddLocal(pendingItem));
    }
  };

  if (!pendingItem) return null;

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="xs"
      fullWidth
      TransitionComponent={SlideTransition}
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
          },
        }
      }}
    >
      {/* Warning stripe at top */}
      <Box
        sx={{
          height: 5,
          background: 'linear-gradient(90deg, #FF6B6B, #FF8E53)',
        }}
      />

      {/* Title */}
      <DialogTitle sx={{ pt: 2.5, pb: 1, px: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: alpha(theme.palette.warning.main, 0.12),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <WarningIcon sx={{ color: 'warning.main', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.25 }}>
              Replace cart items?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              You can only order from one restaurant at a time
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 1, pb: 0 }}>
        {/* Restaurant transition visual */}
        <RestaurantTransition
          fromName={currentRestaurant?.name}
          toName={pendingItem?.restaurantName}
        />

        {/* Description */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
          Adding items from{' '}
          <Typography component="span" variant="body2" fontWeight={700} color="text.primary">
            {pendingItem?.restaurantName || 'this restaurant'}
          </Typography>{' '}
          will clear your current cart from{' '}
          <Typography component="span" variant="body2" fontWeight={700} color="text.primary">
            {currentRestaurant?.name || 'another restaurant'}
          </Typography>
          .
        </Typography>

        {/* Current cart preview */}
        <Box
          sx={{
            bgcolor: 'grey.50',
            borderRadius: 2,
            p: 1.5,
            mb: 1,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
            <DeleteIcon sx={{ fontSize: 15, color: 'error.light' }} />
            <Typography variant="caption" fontWeight={700} color="error.main">
              Items that will be removed:
            </Typography>
          </Box>

          <Stack divider={<Divider flexItem />}>
            {previewItems.map((item) => (
              <CartItemPreview key={item.id} item={item} />
            ))}
          </Stack>

          {extraCount > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, textAlign: 'center' }}>
              +{extraCount} more item{extraCount > 1 ? 's' : ''}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
        <Button
          onClick={handleCancel}
          variant="outlined"
          fullWidth
          sx={{
            borderRadius: 6,
            fontWeight: 700,
            py: 1.1,
            borderColor: 'divider',
            color: 'text.primary',
            '&:hover': { borderColor: 'text.secondary', bgcolor: 'grey.50' },
          }}
        >
          Keep current cart
        </Button>

        <Button
          onClick={handleClearAndAdd}
          variant="contained"
          fullWidth
          sx={{
            borderRadius: 6,
            fontWeight: 700,
            py: 1.1,
            background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
            '&:hover': {
              boxShadow: '0 6px 18px rgba(255, 107, 107, 0.45)',
              transform: 'translateY(-1px)',
            },
            transition: 'all 0.2s',
          }}
        >
          Clear cart & add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CartConflictModal;
