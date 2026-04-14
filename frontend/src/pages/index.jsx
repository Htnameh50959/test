// src/pages/HomePage.jsx
export default function HomePage() {
  return <div style={{ padding: 32 }}><h1>Home — Restaurant Search</h1><p>Search + geo-filtered restaurant listing goes here.</p></div>;
}

// src/pages/RestaurantPage.jsx
export default function RestaurantPage() {
  return <div style={{ padding: 32 }}><h1>Restaurant Detail</h1></div>;
}

// src/pages/CheckoutPage.jsx
export default function CheckoutPage() {
  return <div style={{ padding: 32 }}><h1>Checkout</h1></div>;
}

// src/pages/OrdersPage.jsx
export default function OrdersPage() {
  return <div style={{ padding: 32 }}><h1>My Orders</h1></div>;
}

// src/pages/OrderTrackingPage.jsx
export default function OrderTrackingPage() {
  return <div style={{ padding: 32 }}><h1>Order Tracking</h1></div>;
}

// src/pages/LoginPage.jsx
export default function LoginPage() {
  return <div style={{ padding: 32 }}><h1>Login</h1></div>;
}

// src/pages/RegisterPage.jsx
export default function RegisterPage() {
  return <div style={{ padding: 32 }}><h1>Register</h1></div>;
}

// src/pages/ProfilePage.jsx
export default function ProfilePage() {
  return <div style={{ padding: 32 }}><h1>Profile</h1></div>;
}

// src/pages/NotFoundPage.jsx
export default function NotFoundPage() {
  return (
    <div style={{ padding: 64, textAlign: 'center' }}>
      <h1 style={{ fontSize: 72, color: '#E63946' }}>404</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/" style={{ color: '#E63946' }}>← Go home</a>
    </div>
  );
}
