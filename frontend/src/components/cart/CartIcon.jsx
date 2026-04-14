// src/components/cart/CartIcon.jsx
// Animated shopping cart icon with item count badge.
// Bounces the badge whenever a new item is added to the cart.

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconButton, Badge, Tooltip, alpha, useTheme } from '@mui/material';
import { ShoppingCart } from '@mui/icons-material';

import {
  selectCartItemCount,
  selectIsDrawerOpen,
  selectBadgeAnimating,
  toggleCartDrawer,
  resetBadgeAnimation,
} from '@/redux/slices/cartSlice';

// CSS animation keyframes injected once
const injectBadgeStyles = (() => {
  let injected = false;
  return () => {
    if (injected || typeof document === 'undefined') return;
    injected = true;
    const style = document.createElement('style');
    style.textContent = `
      @keyframes badgeBounce {
        0%   { transform: scale(1); }
        30%  { transform: scale(1.6); }
        55%  { transform: scale(0.9); }
        75%  { transform: scale(1.2); }
        100% { transform: scale(1); }
      }
      .badge-bounce .MuiBadge-badge {
        animation: badgeBounce 0.55s cubic-bezier(0.36, 0.07, 0.19, 0.97);
      }
      @keyframes cartWiggle {
        0%, 100% { transform: rotate(0deg); }
        20%       { transform: rotate(-12deg); }
        40%       { transform: rotate(12deg); }
        60%       { transform: rotate(-8deg); }
        80%       { transform: rotate(6deg); }
      }
      .cart-wiggle {
        animation: cartWiggle 0.5s ease-in-out;
      }
    `;
    document.head.appendChild(style);
  };
})();

export default function CartIcon({ size = 'medium', showTooltip = true, sx = {} }) {
  const dispatch        = useDispatch();
  const theme           = useTheme();
  const itemCount       = useSelector(selectCartItemCount);
  const isDrawerOpen    = useSelector(selectIsDrawerOpen);
  const badgeAnimating  = useSelector(selectBadgeAnimating);

  const iconRef = React.useRef(null);

  // Inject badge animation styles on first render
  useEffect(() => { injectBadgeStyles(); }, []);

  // Trigger wiggle animation on the cart icon when badge animates
  useEffect(() => {
    if (!badgeAnimating) return;

    const el = iconRef.current;
    if (el) {
      el.classList.add('cart-wiggle');
      const tid = setTimeout(() => {
        el.classList.remove('cart-wiggle');
        dispatch(resetBadgeAnimation());
      }, 600);
      return () => clearTimeout(tid);
    }
  }, [badgeAnimating, dispatch]);

  const button = (
    <IconButton
      onClick={() => dispatch(toggleCartDrawer())}
      size={size}
      aria-label={`Cart — ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
      aria-expanded={isDrawerOpen}
      sx={{
        position: 'relative',
        color: isDrawerOpen ? 'primary.main' : 'inherit',
        bgcolor: isDrawerOpen ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
        '&:hover': {
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          color: 'primary.main',
        },
        transition: 'all 0.2s ease',
        ...sx,
      }}
    >
      <Badge
        badgeContent={itemCount > 0 ? itemCount : null}
        color="primary"
        max={99}
        className={badgeAnimating ? 'badge-bounce' : ''}
        sx={{
          '& .MuiBadge-badge': {
            fontSize: '0.65rem',
            fontWeight: 800,
            minWidth: 18,
            height: 18,
            padding: '0 4px',
          },
        }}
      >
        <ShoppingCart
          ref={iconRef}
          sx={{
            fontSize: size === 'small' ? 20 : size === 'large' ? 28 : 24,
          }}
        />
      </Badge>
    </IconButton>
  );

  if (!showTooltip) return button;

  return (
    <Tooltip
      title={itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''} in cart` : 'Cart is empty'}
      placement="bottom"
    >
      {button}
    </Tooltip>
  );
}
