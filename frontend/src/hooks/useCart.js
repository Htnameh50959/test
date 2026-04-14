import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';

import {
  selectCartItems, selectCartTotals, selectCartRestaurant,
  selectCartItemCount, selectCartLoading, selectCartError, selectCartWarnings,
  fetchCart, addItemToCart, updateCartItem, removeCartItem, clearCart, resetCart,
} from '@/redux/slices/cartSlice';

export const useCart = () => {
  const dispatch = useDispatch();
  return {
    items:      useSelector(selectCartItems),
    totals:     useSelector(selectCartTotals),
    restaurant: useSelector(selectCartRestaurant),
    itemCount:  useSelector(selectCartItemCount),
    loading:    useSelector(selectCartLoading),
    error:      useSelector(selectCartError),
    warnings:   useSelector(selectCartWarnings),
    fetchCart:  useCallback(()                 => dispatch(fetchCart()),                            [dispatch]),
    addItem:    useCallback((data)             => dispatch(addItemToCart(data)),                    [dispatch]),
    updateItem: useCallback((id, qty)          => dispatch(updateCartItem({ menuItemId: id, quantity: qty })), [dispatch]),
    removeItem: useCallback((id)               => dispatch(removeCartItem(id)),                    [dispatch]),
    clearCart:  useCallback(()                 => dispatch(clearCart()),                            [dispatch]),
    resetCart:  useCallback(()                 => dispatch(resetCart()),                            [dispatch]),
  };
};
