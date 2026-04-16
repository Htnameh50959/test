// src/router/index.jsx
// Centralised route configuration using React Router v7 (createBrowserRouter).

import { createBrowserRouter, Navigate } from 'react-router-dom';

import { lazy, Suspense } from 'react';

// ── Layout ─────────────────────────────────────────────────────────────────────
import AppLayout          from '@/components/layout/AppLayout';
import AuthLayout         from '@/components/layout/AuthLayout';
import ProtectedRoute     from '@/components/common/ProtectedRoute';
import PageLoader         from '@/components/common/PageLoader';

// ── Lazy-loaded pages ──────────────────────────────────────────────────────────
const HomePage            = lazy(() => import('@/pages/HomePage'));
const RestaurantPage      = lazy(() => import('@/pages/RestaurantPage'));
const CheckoutPage        = lazy(() => import('@/pages/CheckoutPage'));
const OrdersPage          = lazy(() => import('@/pages/OrdersPage'));
const OrderTrackingPage   = lazy(() => import('@/pages/OrderTrackingPage'));
const LoginPage           = lazy(() => import('@/pages/LoginPage'));
const RegisterPage        = lazy(() => import('@/pages/RegisterPage'));
const MerchantRegisterPage = lazy(() => import('@/pages/MerchantRegisterPage'));
const ProfilePage         = lazy(() => import('@/pages/ProfilePage'));
const SearchPage          = lazy(() => import('@/pages/SearchPage'));
const OrderConfirmationPage = lazy(() => import('@/pages/OrderConfirmationPage'));
const MerchantDashboard   = lazy(() => import('@/pages/merchant/MerchantDashboard'));
const MerchantOrders      = lazy(() => import('@/pages/merchant/MerchantOrders'));
const MerchantBookings    = lazy(() => import('@/pages/merchant/MerchantBookings'));
const MerchantMenu        = lazy(() => import('@/pages/merchant/MerchantMenu'));
const MerchantAnalytics   = lazy(() => import('@/pages/merchant/MerchantAnalytics'));
const MerchantProfile     = lazy(() => import('@/pages/merchant/MerchantProfile'));
const AdminDashboard      = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsers          = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminMerchants      = lazy(() => import('@/pages/admin/AdminMerchants'));
const AdminPerformance    = lazy(() => import('@/pages/admin/AdminPerformance'));
const ReservationsPage    = lazy(() => import('@/pages/ReservationsPage'));
const NotFoundPage        = lazy(() => import('@/pages/NotFoundPage'));
const CourierDashboard   = lazy(() => import('@/pages/courier/CourierDashboard'));
import ErrorPage from '@/pages/ErrorPage';


// ── Suspense wrapper ───────────────────────────────────────────────────────────
const wrap = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

// ── Router ─────────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    // Public app shell (Header + Footer)
    path:    '/',
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true,               element: wrap(HomePage) },
      { path: 'restaurants/:id',   element: wrap(RestaurantPage) },
      { path: 'search',            element: wrap(SearchPage) },
      { path: 'reservations',      element: wrap(ReservationsPage) },
      { path: 'reservations/:id',  element: wrap(ReservationsPage) },

      // Protected routes — require authentication
      {
        element: <ProtectedRoute />,
        children: [
          { path: 'checkout',        element: wrap(CheckoutPage) },
          { path: 'orders',          element: wrap(OrdersPage) },
          { path: 'orders/:id',      element: wrap(OrderTrackingPage) },
          { path: 'orders/:id/success', element: wrap(OrderConfirmationPage) },
          { path: 'profile',         element: wrap(ProfilePage) },
        ],
      },
    ],
  },

  {
    // Merchant Command Center
    path: '/merchant',
    element: <ProtectedRoute allowedRoles={['merchant', 'admin']} />,
    children: [
      { index: true, element: <Navigate to="/merchant/dashboard" replace /> },
      { path: 'dashboard', element: wrap(MerchantDashboard) },
      { path: 'orders', element: wrap(MerchantOrders) },
      { path: 'bookings', element: wrap(MerchantBookings) },
      { path: 'menu', element: wrap(MerchantMenu) },
      { path: 'analytics', element: wrap(MerchantAnalytics) },
      { path: 'profile', element: wrap(MerchantProfile) },
    ],
  },
  {
    // Admin Control Center
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: wrap(AdminDashboard) },
      { path: 'users', element: wrap(AdminUsers) },
      { path: 'merchants', element: wrap(AdminMerchants) },
      { path: 'performance', element: wrap(AdminPerformance) },
    ],
  },
  {
    // Courier Hub
    path: '/courier',
    element: <ProtectedRoute allowedRoles={['courier', 'admin']} />,
    children: [
      { index: true, element: <Navigate to="/courier/dashboard" replace /> },
      { path: 'dashboard', element: wrap(CourierDashboard) },
    ],
  },


  {
    // Auth shell (centered card, no nav)
    path:    '/',
    element: <AuthLayout />,
    children: [
      { path: 'login',             element: wrap(LoginPage) },
      { path: 'register',          element: wrap(RegisterPage) },
      { path: 'merchant/register', element: wrap(MerchantRegisterPage) },
    ],
  },

  // Catch-all
  { path: '*', element: wrap(NotFoundPage) },
]);

export default router;
