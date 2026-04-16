import React, { useEffect, useState, useRef, useMemo, Suspense, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Menu,
  Paper,
  Stack,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Vite/Webpack breaking Leaflet's default marker icon asset paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
import { 
  Star, 
  Timer, 
  DeliveryDining, 
  LocationOn, 
  FavoriteBorder, 
  Favorite,
  Verified,
  Directions,
  InfoOutlined,
  ShoppingCartOutlined
} from '@mui/icons-material';

import { 
  fetchRestaurantById, 
  fetchRestaurantAnalytics,
  selectCurrentRestaurant, 
  selectRestaurantMenuByCategory,
  selectRestaurantAnalytics,
  selectRestaurantDetailLoading 
} from '@/redux/slices/restaurantsSlice';
import { 
  selectCartItems, 
  selectCartTotals, 
  selectPendingItem,
  clearPendingItem
} from '@/redux/slices/cartSlice';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';
import { formatCurrency } from '@/utils';
import { calculateItemPrice } from '@/redux/slices/cartSlice';


// Components
import { RestaurantDetailSkeleton } from '@/components/restaurants/RestaurantSkeletons';
import { MenuItemCard } from '@/components/restaurants/MenuItemCard';
import { ModifierModal } from '@/components/restaurants/ModifierModal';
import OptimizedImage from '@/components/common/OptimizedImage';
const ReviewSection = React.lazy(() => import('@/components/restaurants/ReviewSection').then(m => ({ default: m.ReviewSection })));
import { CartConflictModal } from '@/components/cart/CartConflictModal';

/**
 * RestaurantPage
 * 
 * The main container for a restaurant's profile.
 * Features:
 * - Redux-driven state (details, menu, analytics)
 * - Tabbed navigation (Menu, Reviews, Info)
 * - Category sticky navigation for Menu
 * - Modals for customization and cart conflicts
 */
const RestaurantPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Selectors
  const restaurant = useSelector(selectCurrentRestaurant);
  const menuByCategory = useSelector(selectRestaurantMenuByCategory);
  const analytics = useSelector(selectRestaurantAnalytics);
  const loading = useSelector(selectRestaurantDetailLoading);
  const cartItems = useSelector(selectCartItems);
  const cartTotals = useSelector(selectCartTotals);
  const pendingItem = useSelector(selectPendingItem);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Local State
  const [activeTab, setActiveTab] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');

  const categoryRefs = useRef({});

  // Fetch Data
  useEffect(() => {
    if (id) {
      dispatch(fetchRestaurantById(id));
      dispatch(fetchRestaurantAnalytics(id));
      window.scrollTo(0, 0);
    }
  }, [id, dispatch]);

  // Sync activeCategory to the first available category when menu loads
  useEffect(() => {
    const categories = Object.keys(menuByCategory || {});
    if (categories.length > 0 && (!activeCategory || !categories.includes(activeCategory))) {
      setActiveCategory(categories[0]);
    }
  }, [menuByCategory]);

  // SEO
  useEffect(() => {
    if (restaurant) {
      document.title = `${restaurant.name} | Order Online | Antigravity Food`;
    }
  }, [restaurant]);

  // Logic: Scroll Spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200;
      Object.entries(categoryRefs.current).forEach(([cat, ref]) => {
        if (ref && ref.offsetTop <= scrollPos && ref.offsetTop + ref.offsetHeight > scrollPos) {
          setActiveCategory(cat);
        }
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab]);

  const scrollToCategory = useCallback((cat) => {
    const ref = categoryRefs.current[cat];
    if (ref) {
      window.scrollTo({
        top: ref.offsetTop - 150,
        behavior: 'smooth'
      });
    }
  }, []);

  // Formatting Helpers - Memoized
  const cuisineStr = useMemo(() => restaurant?.cuisineTypes?.join(' • '), [restaurant?.cuisineTypes]);
  const addressStr = useMemo(() => [restaurant?.address?.street, restaurant?.address?.city].filter(Boolean).join(', '), [restaurant?.address]);

  if (loading || !restaurant) {
    return <RestaurantDetailSkeleton />;
  }

  return (
    <Box sx={{ pb: 8, bgcolor: 'background.default' }}>
      {/* 1. Stunning Hero Section */}
      <Box 
        sx={{ 
          height: { xs: 300, md: 500 }, 
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <OptimizedImage
          src={restaurant.coverImage || `https://picsum.photos/seed/${restaurant._id}/1200/600`}
          alt={restaurant.name}
          aspectRatio={isMobile ? "16/9" : "21/9"}
        />
        {/* Deep Overlay Gradient */}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)', zIndex: 3 }} />
        
        <Box sx={{ position: 'absolute', bottom: 60, left: 0, right: 0, zIndex: 4 }}>
          <Container maxWidth="lg">
            <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
              <Chip 
                label="MICHELIN RECOMMENDED" 
                size="small" 
                sx={{ 
                  bgcolor: 'rgba(216, 88, 48, 0.9)', 
                  color: 'white', 
                  backdropFilter: 'blur(8px)', 
                  fontWeight: 900, 
                  fontSize: '0.65rem',
                  border: 'none'
                }} 
              />
              <Chip 
                label="ECO-CERTIFIED" 
                size="small" 
                sx={{ 
                  bgcolor: 'rgba(77, 124, 94, 0.9)', 
                  color: 'white', 
                  backdropFilter: 'blur(8px)', 
                  fontWeight: 900, 
                  fontSize: '0.65rem',
                  border: 'none'
                }} 
              />
            </Stack>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <Box>
                <Typography variant="h1" color="white" sx={{ mb: 1.5, fontSize: { xs: '2.5rem', md: '4rem' } }}>
                  {restaurant.name}
                </Typography>
                <Stack direction="row" spacing={3} sx={{ color: 'rgba(255,255,255,0.9)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Star sx={{ color: 'warning.main', fontSize: 20 }} />
                    <Typography fontWeight={800} variant="h6">{restaurant.rating?.average || '4.9'}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>(1.2k+ Reviews)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Timer sx={{ fontSize: 20 }} />
                    <Typography fontWeight={800} variant="h6">25-35 min</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography fontWeight={800} variant="h6">$$$</Typography>
                  </Box>
                </Stack>
              </Box>

              <Stack direction="row" spacing={2} sx={{ mb: 1 }}>
                <Button 
                   variant="outlined" 
                   disabled={restaurant.isReservationsEnabled === false}
                   onClick={() => navigate(`/reservations/${id}`)}
                   sx={{ 
                     borderRadius: 8, px: 4, py: 1.5, fontWeight: 900, 
                     color: 'white', borderColor: 'rgba(255,255,255,0.4)',
                     backdropFilter: 'blur(10px)',
                     '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                     '&.Mui-disabled': { color: 'rgba(255,255,255,0.3)', borderColor: 'rgba(255,255,255,0.1)' }
                   }}
                >
                   {restaurant.isReservationsEnabled === false ? 'BOOKING CLOSED' : 'RESERVE A TABLE'}
                </Button>
                <Button 
                   variant="contained" 
                   sx={{ borderRadius: 8, px: 5, py: 1.5, fontWeight: 900, fontSize: '1rem', boxShadow: '0 8px 32px rgba(216, 88, 48, 0.4)' }}
                >
                   ORDER NOW
                </Button>
              </Stack>
            </Box>
          </Container>
        </Box>
      </Box>

      <Container maxWidth="lg" sx={{ mt: 6 }}>
        <Grid container spacing={6}>
          {/* Main Content Area */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 5 }}>
              <Tabs 
                value={activeTab} 
                onChange={(_, v) => setActiveTab(v)}
                sx={{
                  '& .MuiTab-root': { fontWeight: 900, fontSize: '0.9rem', px: 3, transition: '0.3s' },
                  '& .Mui-selected': { color: 'primary.main' },
                  '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' }
                }}
              >
                <Tab label="Menu" />
                <Tab label="Reviews" />
                <Tab label="Experience" />
              </Tabs>
            </Box>

            {activeTab === 0 && (
              <Box sx={{ position: 'sticky', top: 0, zIndex: 10, bgcolor: 'background.default', borderBottom: '1px solid rgba(0,0,0,0.05)', mb: 4, py: 1 }}>
                <Tabs 
                   value={activeCategory} 
                   onChange={(_, v) => { setActiveCategory(v); scrollToCategory(v); }}
                   variant="scrollable"
                   scrollButtons="auto"
                   sx={{ 
                     minHeight: 48,
                     '& .MuiTab-root': { fontWeight: 900, textTransform: 'capitalize', minWidth: 100, fontSize: '0.8rem' } 
                   }}
                >
                   {Object.keys(menuByCategory).map(cat => (
                     <Tab key={cat} label={cat} value={cat} />
                   ))}
                </Tabs>
              </Box>
            )}

            {activeTab === 0 && (
              <Stack spacing={8}>
                {Object.entries(menuByCategory).map(([cat, items]) => (
                  <Box key={cat} ref={el => categoryRefs.current[cat] = el}>
                    <Typography variant="h4" sx={{ mb: 4, letterSpacing: '-0.02em', fontWeight: 900 }}>{cat}</Typography>
                    <Grid container spacing={3}>
                      {items.map(item => (
                        <Grid size={{ xs: 12 }} key={item._id}>
                          <MenuItemCard 
                            item={{ ...item, isPopular: item.name.length % 3 === 0 }} // Mocking popularity
                            onSelect={(item) => setSelectedItem(item)} 
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                ))}
              </Stack>
            )}

            {/* AI Review Summary Section (Placeholder for design match) */}
            {activeTab === 0 && (
              <Box sx={{ mt: 10, p: 4, bgcolor: alpha(theme.palette.success.main, 0.05), borderRadius: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                   <Typography variant="h3" color="success.main">4.9</Typography>
                   <Box>
                     <Typography variant="subtitle2" fontWeight={800} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                       <Box component="span">✦</Box> AI Summary of 1,240 Reviews
                     </Typography>
                     <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                       "Diners consistently praise the <Box component="span" sx={{ color: 'success.main', fontWeight: 700 }}>Wagyu Sirloin</Box> for its buttery texture. The atmosphere is noted as <Box component="span" sx={{ color: 'success.main', fontWeight: 700 }}>energetic yet intimate</Box>..."
                     </Typography>
                   </Box>
                </Box>
              </Box>
            )}
          </Grid>

          {/* Sidebar Area */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{ position: 'sticky', top: 120 }}>
              <Paper sx={{ p: 4, borderRadius: 6, bgcolor: '#FBF9F6', border: '1px solid rgba(0,0,0,0.03)', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                  <Typography variant="h5" fontWeight={900}>Your Order</Typography>
                  <Chip label={`${cartItems.length} items`} size="small" />
                </Box>
                
                <Stack spacing={3} sx={{ mb: 4 }}>
                  {cartItems.map((item) => (
                    <Box key={item.id} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Box sx={{ px: 1, py: 0.2, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.75rem', fontWeight: 900 }}>
                        {item.quantity || 1}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight={800}>{item.name}</Typography>
                        {item.modifiers?.map(m => (
                          <Typography key={m._id} variant="caption" color="text.secondary" display="block">
                            + {m.name}
                          </Typography>
                        ))}
                      </Box>
                      <Typography variant="subtitle2" fontWeight={900}>
                        {formatCurrency(calculateItemPrice(item))}
                      </Typography>
                    </Box>
                  ))}

                  {cartItems.length === 0 && (
                    <Typography color="text.secondary" sx={{ fontStyle: 'italic', py: 4, textAlign: 'center' }}>
                      Start adding items from the menu
                    </Typography>
                  )}
                </Stack>

                <Divider sx={{ mb: 4, borderStyle: 'dashed' }} />

                <Stack spacing={1.5} sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                    <Typography variant="body2" fontWeight={700}>{formatCurrency(cartTotals.subtotal)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Delivery Fee</Typography>
                    <Typography variant="body2" fontWeight={700}>{formatCurrency(cartTotals.deliveryFee)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="h6" fontWeight={900}>Total</Typography>
                    <Typography variant="h6" fontWeight={900} color="primary.main">{formatCurrency(cartTotals.total)}</Typography>
                  </Box>
                </Stack>

                <Button 
                  fullWidth 
                  variant="contained" 
                  size="large"
                  disabled={cartItems.length === 0}
                  onClick={() => navigate('/checkout')}
                  sx={{ 
                    borderRadius: 4, 
                    py: 2, 
                    fontSize: '1rem',
                    boxShadow: '0 12px 30px rgba(216, 88, 48, 0.4)'
                  }}
                  endIcon={<span>→</span>}
                >
                  Checkout Now
                </Button>
              </Paper>
              
              {/* Extra Service Info */}
              <Paper sx={{ p: 3, mt: 3, borderRadius: 4, border: '1px solid rgba(77, 124, 94, 0.1)', bgcolor: alpha(theme.palette.success.main, 0.02) }}>
                 <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Box sx={{ p: 1, bgcolor: alpha(theme.palette.success.main, 0.1), borderRadius: 2 }}>
                       <Timer sx={{ color: 'success.main', fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={900} color="success.main">Hyper-Fast Delivery</Typography>
                      <Typography variant="caption" color="text.secondary">Arriving in approx. 28 mins</Typography>
                    </Box>
                 </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Container>

        {/* Tab Content: Reviews */}
        {activeTab === 1 && (
          <Suspense fallback={<Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>}>
            <ReviewSection 
              restaurantId={restaurant._id} 
              analytics={analytics} 
              onError={(e) => console.error('ReviewSection load failure:', e)} 
            />
          </Suspense>
        )}


        {/* Tab Content: Info */}
        {activeTab === 2 && (
          <Box>
            <Grid container spacing={6}>
              <Grid size={{ xs: 12, md: 7 }}>
                <Typography variant="h6" fontWeight={900} gutterBottom>About {restaurant.name}</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.8 }}>
                  {restaurant.description || "Welcome to our kitchen! We take pride in serving high-quality ingredients with love. Our secret recipe has been perfected over years to give you the most authentic taste in the city."}
                </Typography>
                
                <Divider sx={{ mb: 4 }} />
                
                <Typography variant="h6" fontWeight={900} gutterBottom>Operating Hours</Typography>
                <Stack spacing={1.5} sx={{ maxWidth: 400 }}>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    const hours = restaurant.operatingHours?.[day] || { isOpen: true, openTime: '09:00', closeTime: '22:00' };
                    return (
                      <Box key={day} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{day}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {hours.isOpen ? `${hours.openTime} - ${hours.closeTime}` : 'Closed'}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                 <Paper sx={{ p: 1, borderRadius: 4, overflow: 'hidden', height: 320 }}>
                    <MapContainer 
                      center={restaurant.location?.coordinates ? [restaurant.location.coordinates[1], restaurant.location.coordinates[0]] : [17.3850, 78.4867]} 
                      zoom={15} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                      {restaurant.location?.coordinates && (
                        <Marker position={[restaurant.location.coordinates[1], restaurant.location.coordinates[0]]}>
                          <Popup>
                            <strong>{restaurant.name}</strong><br />
                            {restaurant.address?.street || ''}{restaurant.address?.city ? `, ${restaurant.address.city}` : ''}
                          </Popup>
                        </Marker>
                      )}
                      {!restaurant.location?.coordinates && (
                        <Marker position={[17.3850, 78.4867]}>
                          <Popup><strong>{restaurant.name}</strong></Popup>
                        </Marker>
                      )}
                    </MapContainer>
                  </Paper>
                  <Box sx={{ mt: 2 }}>
                    <Typography fontWeight={900}>{addressStr || 'Strategic Location'}</Typography>
                    <Typography variant="body2" color="text.secondary">{restaurant.address?.city}, {restaurant.address?.state}</Typography>
                  </Box>

                  <Paper sx={{ p: 3, borderRadius: 4, mt: 3, bgcolor: '#fbfbfb' }}>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <IconButton sx={{ bgcolor: 'white' }}><InfoOutlined color="primary" /></IconButton>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={800}>Contact Information</Typography>
                          <Typography variant="body2" color="text.secondary">{restaurant.merchantId?.email || 'contact@restaurant.com'}</Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
        )}

      {/* Floating Cart Button (Mobile Only) */}
      {isMobile && cartItems.length > 0 && (
        <AppBar position="fixed" color="primary" sx={{ top: 'auto', bottom: 0, borderRadius: '24px 24px 0 0' }}>
          <Toolbar>
            <Box sx={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box sx={{ bgcolor: 'white', color: 'primary.main', px: 1, borderRadius: 1, fontWeight: 900 }}>
                  {cartItems.length}
                </Box>
                <Typography variant="body1" fontWeight={700}>View Cart</Typography>
              </Stack>
              <Typography variant="h6" fontWeight={900}>{formatCurrency(cartTotals.total)}</Typography>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* Modals */}
      <ModifierModal 
        open={!!selectedItem} 
        onClose={() => setSelectedItem(null)} 
        item={selectedItem} 
        restaurantId={restaurant._id}
      />

      <CartConflictModal 
        open={!!pendingItem} 
        pendingItem={pendingItem} 
      />
    </Box>
  );
};

export default RestaurantPage;
