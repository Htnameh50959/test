import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';

import {
  selectActiveOrders, selectOrderHistory, selectCurrentOrder,
  selectOrdersLoading, selectOrdersError,
  placeOrder, fetchOrderHistory, fetchOrderById, cancelOrder,
} from '@/redux/slices/ordersSlice';

export const useOrders = () => {
  const dispatch = useDispatch();
  return {
    activeOrders: useSelector(selectActiveOrders),
    orderHistory: useSelector(selectOrderHistory),
    currentOrder: useSelector(selectCurrentOrder),
    loading:      useSelector(selectOrdersLoading),
    error:        useSelector(selectOrdersError),
    placeOrder:   useCallback((data)       => dispatch(placeOrder(data)),                          [dispatch]),
    fetchHistory: useCallback((params)     => dispatch(fetchOrderHistory(params)),                 [dispatch]),
    fetchById:    useCallback((id)         => dispatch(fetchOrderById(id)),                        [dispatch]),
    cancelOrder:  useCallback((id, reason) => dispatch(cancelOrder({ orderId: id, reason })),     [dispatch]),
  };
};
