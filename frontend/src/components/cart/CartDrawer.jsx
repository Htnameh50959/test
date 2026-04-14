// src/components/cart/CartDrawer.jsx
// Premium slide-in cart drawer — right on desktop, bottom sheet on mobile.

import React, { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  Stack,
  Chip,
  Avatar,
  Tooltip,
  useTheme,
  useMediaQuery,
  Skeleton,
  alpha,
  Fade,
} from '@mui/material';
import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Remove as RemoveIcon,
  Add as AddIcon,
  ShoppingCart as CartIcon,
  Restaurant as RestaurantIcon,
  ArrowForward as ArrowForwardIcon,
  LocalOffer as LocalOfferIcon,
  Stars as StarsIcon,
} from '@mui/icons-material';

import {
  selectCartItems,
  selectCartTotals,
  selectCartRestaurant,
  selectCartLoading,
  selectIsDrawerOpen,
  selectAppliedCoupon,
  selectLoyaltyPoints,
  closeCartDrawer,
  removeItem,
  updateQuantity,
} from '@/redux/slices/cartSlice';
import { formatCurrency } from '@/utils/formatters';

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Animated quantity selector */
function QuantityControl({ id, quantity, onIncrement, onDecrement }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        border: '1.5px solid',
        borderColor: 'primary.main',
        borderRadius: 6,
        overflow: 'hidden',
        height: 32,
      }}
    >
      <IconButton
        size="small"
        onClick={onDecrement}
        sx={{ borderRadius: 0, width: 28, height: '100%', color: 'primary.main' }}
        aria-label="decrease quantity"
      >
        <RemoveIcon sx={{ fontSize: 14 }} />
      </IconButton>

      <Typography
        sx={{
          minWidth: 28,
          textAlign: 'center',
          fontWeight: 700,
          fontSize: '0.85rem',
          color: 'primary.main',
        }}
      >
        {quantity}
      </Typography>

      <IconButton
        size="small"
        onClick={onIncrement}
        sx={{ borderRadius: 0, width: 28, height: '100%', color: 'primary.main' }}
        aria-label="increase quantity"
      >
        <AddIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
}

/** Single cart item row */
function CartItemRow({ item, onRemove, onIncrement, onDecrement }) {
  const theme = useTheme();
  const unitPrice = (item.price || 0) + (item.modifiers ?? []).reduce((s, m) => s + (m.price || 0), 0);
  const lineTotal = unitPrice * (item.quantity || 1);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        py: 1.5,
        px: 0,
        transition: 'background 0.2s',
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.03) },
        borderRadius: 2,
      }}
    >
      {/* Item image or emoji avatar */}
      <Avatar
        src={item.image}
        variant="rounded"
        sx={{
          width: 52,
          height: 52,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          fontSize: '1.4rem',
          flexShrink: 0,
          borderRadius: 2,
        }}
      >
        {!item.image && '🍽️'}
      </Avatar>

      {/* Name, modifiers, controls */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          fontWeight={700}
          noWrap
          sx={{ color: 'text.primary', fontSize: '0.88rem' }}
        >
          {item.name}
        </Typography>

        {/* Modifiers list */}
        {item.modifiers?.length > 0 && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              mt: 0.25,
            }}
          >
            {item.modifiers.map((m) => m.name).join(', ')}
          </Typography>
        )}

        {/* Price & controls row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.75 }}>
          <Typography variant="body2" fontWeight={700} color="primary.main">
            {formatCurrency(lineTotal)}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <QuantityControl
              id={item.id}
              quantity={item.quantity || 1}
              onIncrement={() => onIncrement(item)}
              onDecrement={() => onDecrement(item)}
            />

            <Tooltip title="Remove item" placement="top">
              <IconButton
                size="small"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.name}`}
                sx={{
                  color: 'error.light',
                  ml: 0.5,
                  '&:hover': { color: 'error.main', bgcolor: alpha('#f44336', 0.08) },
                  transition: 'all 0.2s',
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

/** Totals breakdown section */
function TotalsBreakdown({ totals, appliedCoupon, loyaltyPoints }) {
  const rows = [
    { label: 'Subtotal',     value: totals.subtotal,     bold: false },
    { label: 'Delivery fee', value: totals.deliveryFee,  bold: false, note: totals.deliveryFee === 0 ? 'Free' : null },
    { label: 'Service fee (5%)', value: totals.serviceFee, bold: false },
    { label: 'Tax & GST (8%)',   value: totals.tax,      bold: false },
  ];

  if (appliedCoupon && totals.couponDiscount > 0) {
    rows.push({ label: `Coupon (${appliedCoupon.code})`, value: -totals.couponDiscount, bold: false, discount: true });
  }
  if (loyaltyPoints > 0 && totals.loyaltyDiscount > 0) {
    rows.push({ label: `Loyalty points (${loyaltyPoints} pts)`, value: -totals.loyaltyDiscount, bold: false, discount: true });
  }

  return (
    <Box>
      {rows.map(({ label, value, bold, discount, note }) => (
        <Box
          key={label}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 0.5,
          }}
        >
          <Typography variant="body2" fontWeight={bold ? 700 : 400} color={discount ? 'success.main' : 'text.secondary'}>
            {label}
          </Typography>
          {note === 'Free' ? (
            <Chip label="FREE" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
          ) : (
            <Typography
              variant="body2"
              fontWeight={bold ? 800 : 500}
              color={discount ? 'success.main' : 'text.primary'}
            >
              {discount && value < 0 ? '–' : ''}{formatCurrency(Math.abs(value))}
            </Typography>
          )}
        </Box>
      ))}

      <Divider sx={{ my: 1.5 }} />

      {/* Grand total */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={900} fontSize="1.05rem">
          Total
        </Typography>
        <Typography variant="h6" fontWeight={900} color="primary.main" fontSize="1.1rem">
          {formatCurrency(totals.total)}
        </Typography>
      </Box>
    </Box>
  );
}

/** Empty cart illustration */
function EmptyCart({ onBrowse }) {
  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 6,
          px: 2,
          textAlign: 'center',
        }}
      >
        <Box
          sx={{
            width: 110,
            height: 110,
            borderRadius: '50%',
            bgcolor: 'grey.100',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            fontSize: '3.5rem',
            animation: 'float 3s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%':       { transform: 'translateY(-12px)' },
            },
          }}
        >
          🛒
        </Box>

        <Typography variant="h6" fontWeight={800} gutterBottom>
          Your cart is empty
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, maxWidth: 220 }}>
          Looks like you haven't added any items yet. Explore our restaurants and add something delicious!
        </Typography>

        <Button
          variant="contained"
          size="medium"
          onClick={onBrowse}
          endIcon={<ArrowForwardIcon />}
          sx={{ borderRadius: 6, fontWeight: 700, px: 3 }}
        >
          Browse Restaurants
        </Button>
      </Box>
    </Fade>
  );
}

// ── Main CartDrawer ────────────────────────────────────────────────────────────

export default function CartDrawer() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const theme      = useTheme();
  const isMobile   = useMediaQuery(theme.breakpoints.down('sm'));

  const isOpen        = useSelector(selectIsDrawerOpen);
  const items         = useSelector(selectCartItems);
  const totals        = useSelector(selectCartTotals);
  const restaurant    = useSelector(selectCartRestaurant);
  const isLoading     = useSelector(selectCartLoading);
  const appliedCoupon = useSelector(selectAppliedCoupon);
  const loyaltyPoints = useSelector(selectLoyaltyPoints);

  const [isCheckingOut, setIsCheckingOut] = React.useState(false);
  const itemCount = items.reduce((n, i) => n + (i.quantity || 1), 0);
  const isEmpty   = items.length === 0;

  const handleClose    = useCallback(() => dispatch(closeCartDrawer()), [dispatch]);
  const handleRemove   = useCallback((id) => dispatch(removeItem(id)), [dispatch]);
  const handleIncrement = useCallback((item) => dispatch(updateQuantity({ id: item.id, quantity: (item.quantity || 1) + 1 })), [dispatch]);
  const handleDecrement = useCallback((item) => {
    const newQty = (item.quantity || 1) - 1;
    dispatch(updateQuantity({ id: item.id, quantity: newQty })); // slice removes at 0
  }, [dispatch]);

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    dispatch(closeCartDrawer());
    // Brief delay so the drawer close animation plays
    await new Promise((r) => setTimeout(r, 300));
    navigate('/checkout');
    setIsCheckingOut(false);
  };

  const handleBrowse = () => {
    dispatch(closeCartDrawer());
    navigate('/');
  };

  // Drawer anchor — bottom on mobile, right on desktop
  const anchor = isMobile ? 'bottom' : 'right';

  const drawerWidth = isMobile ? '100%' : 400;
  const drawerHeight = isMobile ? '92dvh' : '100%';

  return (
    <Drawer
      anchor={anchor}
      open={isOpen}
      onClose={handleClose}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        paper: {
          sx: {
            width: drawerWidth,
            height: drawerHeight,
            borderTopLeftRadius: isMobile ? 20 : 0,
            borderTopRightRadius: isMobile ? 20 : 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          },
        }
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2.5,
          py: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CartIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2 }}>
              Your Cart
              {itemCount > 0 && (
                <Chip
                  label={itemCount}
                  size="small"
                  color="primary"
                  sx={{ ml: 1, height: 20, fontSize: '0.7rem', fontWeight: 800 }}
                />
              )}
            </Typography>
            {restaurant?.name && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                <RestaurantIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {restaurant.name}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <IconButton
          onClick={handleClose}
          size="small"
          aria-label="close cart"
          sx={{
            bgcolor: 'grey.100',
            '&:hover': { bgcolor: 'grey.200' },
            transition: 'background 0.2s',
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* ── Drag handle on mobile ──────────────────────────────────── */}
      {isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, flexShrink: 0 }}>
          <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'grey.300' }} />
        </Box>
      )}

      {/* ── Body ──────────────────────────────────────────────────── */}
      {isLoading ? (
        // Loading Skeleton
        <Box sx={{ p: 2.5, flex: 1 }}>
          {[1, 2, 3].map((i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 2.5 }}>
              <Skeleton variant="rounded" width={52} height={52} />
              <Box flex={1}>
                <Skeleton width="70%" height={18} />
                <Skeleton width="40%" height={14} sx={{ mt: 0.5 }} />
                <Skeleton width="90%" height={32} sx={{ mt: 1, borderRadius: 6 }} />
              </Box>
            </Box>
          ))}
        </Box>
      ) : isEmpty ? (
        <EmptyCart onBrowse={handleBrowse} />
      ) : (
        <>
          {/* Items list — scrollable */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              px: 2,
              py: 1,
              '&::-webkit-scrollbar': { width: 4 },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'grey.300',
                borderRadius: 2,
              },
            }}
          >
            <Stack divider={<Divider flexItem />}>
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                />
              ))}
            </Stack>
          </Box>

          {/* ── Footer: Totals + Checkout ──────────────────────────── */}
          <Box
            sx={{
              flexShrink: 0,
              borderTop: '1px solid',
              borderColor: 'divider',
              px: 2.5,
              pt: 2,
              pb: isMobile ? 3 : 2,
              bgcolor: 'background.paper',
              boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
            }}
          >
            {/* Coupon/Loyalty badges */}
            {(appliedCoupon || loyaltyPoints > 0) && (
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                {appliedCoupon && (
                  <Chip
                    icon={<LocalOfferIcon />}
                    label={appliedCoupon.code}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                  />
                )}
                {loyaltyPoints > 0 && (
                  <Chip
                    icon={<StarsIcon />}
                    label={`${loyaltyPoints} pts`}
                    size="small"
                    color="warning"
                    variant="outlined"
                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                  />
                )}
              </Stack>
            )}

            {/* Totals breakdown */}
            <TotalsBreakdown
              totals={totals}
              appliedCoupon={appliedCoupon}
              loyaltyPoints={loyaltyPoints}
            />

            {/* Free delivery nudge */}
            {totals.deliveryFee > 0 && (
              <Box
                sx={{
                  mt: 1.5,
                  p: 1.25,
                  bgcolor: alpha(theme.palette.warning.main, 0.08),
                  borderRadius: 2,
                  border: '1px dashed',
                  borderColor: alpha(theme.palette.warning.main, 0.4),
                }}
              >
                <Typography variant="caption" color="warning.dark" fontWeight={600}>
                  🚚 Add {formatCurrency(500 - totals.subtotal)} more for FREE delivery!
                </Typography>
              </Box>
            )}

            {/* Checkout CTA */}
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleCheckout}
              disabled={isEmpty || isCheckingOut}
              endIcon={isCheckingOut ? null : <ArrowForwardIcon />}
              sx={{
                mt: 2,
                borderRadius: 6,
                fontWeight: 800,
                fontSize: '0.95rem',
                py: 1.4,
                background: isEmpty
                  ? undefined
                  : 'linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)',
                boxShadow: isEmpty ? 'none' : '0 4px 15px rgba(255, 107, 107, 0.35)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 20px rgba(255, 107, 107, 0.45)',
                },
              }}
              aria-label={`Proceed to checkout, total ${formatCurrency(totals.total)}`}
            >
              {isCheckingOut ? 'Opening checkout…' : `Checkout · ${formatCurrency(totals.total)}`}
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  );
}
