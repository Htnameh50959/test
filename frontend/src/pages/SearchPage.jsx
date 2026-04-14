import React, { useEffect, useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Container, Grid, Typography, Stack,
  ToggleButtonGroup, ToggleButton, Select, MenuItem,
  FormControl, InputLabel, Pagination, Alert,
  useTheme, useMediaQuery, Fab, Paper, Chip, IconButton, Divider, Button
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Remove as MinusIcon,
  MyLocation as MyLocationIcon,
  Restaurant as RestaurantIcon,
  FilterList
} from '@mui/icons-material';
import { InputBase } from '@mui/material';

import {
  searchRestaurants,
  selectSearchResults,
  selectSearchFilters,
  selectSearchPagination,
  selectRestaurantsLoading,
  selectRestaurantsError,
  setFilters,
  clearFilters
} from '@/redux/slices/restaurantsSlice';
import { useGeolocation } from '@/hooks/useGeolocation';
import { CUISINE_TYPES } from '@/constants';
import { RestaurantCard, RestaurantSkeleton } from '@/components/restaurants/RestaurantCard';
import { MapView } from '@/components/restaurants/MapView';

import { useSearchParams } from 'react-router-dom';

/**
 * SearchPage
 * 
 * The comprehensive discovery interface for the platform.
 * Integrates deep filtering, sorting, and map visualization.
 */
export default function SearchPage() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Selectors
  const results    = useSelector(selectSearchResults);
  const filters    = useSelector(selectSearchFilters);
  const loading    = useSelector(selectRestaurantsLoading);
  const error      = useSelector(selectRestaurantsError);
  const pagination = useSelector(selectSearchPagination);

  const { location, loading: geoLoading } = useGeolocation({ autoRequest: true });
  
  // Local state for search bar (synced with URL)
  const queryFromUrl = searchParams.get('q') || '';
  const [localQuery, setLocalQuery] = useState(queryFromUrl);
  
  // Mobile view toggle: 'list' or 'map'
  const [mobileView, setMobileView] = useState('list');
  const [selectedId, setSelectedId] = useState(null);

  // Perform search whenever filters, location or search query changes
  const performSearch = useCallback((page = 1) => {
    const params = {
      ...filters,
      q:      queryFromUrl,
      skip:   (page - 1) * 20,
      limit:  20,
      ...(location?.lat && location?.lng && { lat: location.lat, lng: location.lng })
    };
    dispatch(searchRestaurants(params));
  }, [dispatch, filters, location, queryFromUrl]);

  useEffect(() => {
    if (!geoLoading) {
      performSearch();
    }
  }, [performSearch, geoLoading]);

  // Handlers
  const handleQuerySubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: localQuery });
  };

  const handleFilterChange = (newFilter) => {
    dispatch(setFilters(newFilter));
  };

  const handleCuisineToggle = (cuisine) => {
    const newCuisines = filters.cuisineTypes.includes(cuisine)
      ? filters.cuisineTypes.filter(c => c !== cuisine)
      : [...filters.cuisineTypes, cuisine];
    handleFilterChange({ cuisineTypes: newCuisines });
  };

  // ── RENDER SIDEBAR (Results & Filters) ─────────────────────────────────────
  const renderSidebar = () => (
    <Box sx={{ 
      width: { xs: '100%', md: 480, lg: 550 }, 
      height: '100%', 
      overflowY: 'auto', 
      borderRight: { md: '1px solid' },
      borderColor: 'divider',
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'white',
      zIndex: 2,
    }}>
      {/* Search Header */}
      <Box sx={{ p: { xs: 2.5, md: 4 }, pb: 2, bgcolor: 'white', position: 'sticky', top: 0, zIndex: 3 }}>
        <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1, mb: 3 }}>
          Discover <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>Nearby</Box>
        </Typography>

        <Paper
          component="form"
          onSubmit={handleQuerySubmit}
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            bgcolor: '#F8F9FA',
            borderRadius: 4,
            px: 2,
            py: 1,
            mb: 3,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <SearchIcon sx={{ color: 'text.secondary', mr: 2 }} />
          <InputBase
            placeholder="Dishes, cuisines, or restaurants..."
            fullWidth
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            sx={{ fontWeight: 600, fontSize: '0.95rem' }}
          />
        </Paper>

        {/* Quick Filter Row */}
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
          {CUISINE_TYPES.slice(0, 10).map((c) => {
            const isSelected = filters.cuisineTypes.includes(c);
            return (
              <Chip
                key={c}
                label={c}
                onClick={() => handleCuisineToggle(c)}
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'contained' : 'outlined'}
                sx={{ 
                  fontWeight: 800, 
                  borderRadius: 2,
                  bgcolor: isSelected ? 'primary.main' : 'white',
                  transition: 'all 0.2s'
                }}
              />
            );
          })}
        </Stack>
      </Box>

      <Divider />

      {/* Results List */}
      <Box sx={{ p: { xs: 2, md: 4 }, flex: 1 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" fontWeight={800} color="text.secondary">
            {loading ? 'Searching...' : `${pagination.total} venues found`}
          </Typography>
          <Button 
            size="small" 
            startIcon={<FilterList />} 
            sx={{ fontWeight: 900 }}
          >
            Filters
          </Button>
        </Box>

        <Stack spacing={4}>
          {loading && results.length === 0 ? (
            Array.from({ length: 3 }).map((_, i) => <RestaurantSkeleton key={i} />)
          ) : results.length > 0 ? (
            results.map((r) => (
              <Box 
                key={r._id} 
                id={`restaurant-card-${r._id}`}
                sx={{ 
                  position: 'relative',
                  transition: 'all 0.3s',
                  transform: selectedId === r._id ? 'scale(1.02)' : 'none',
                  outline: selectedId === r._id ? `2px solid ${theme.palette.primary.main}` : 'none',
                  outlineOffset: 4,
                  borderRadius: 4
                }}
              >
                <RestaurantCard restaurant={r} />
              </Box>
            ))
          ) : (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <Typography variant="h2">🥘</Typography>
              <Typography variant="h5" fontWeight={900} mt={2}>No matches found</Typography>
              <Typography color="text.secondary">Try adjusting your filters or location.</Typography>
              <Button onClick={() => dispatch(clearFilters())} sx={{ mt: 2, fontWeight: 900 }}>Clear all filters</Button>
            </Box>
          )}
        </Stack>

        {pagination.pages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6, mb: 4 }}>
            <Pagination 
              count={pagination.pages} 
              page={Math.floor(pagination.skip / 20) + 1}
              onChange={(_, page) => performSearch(page)}
              color="primary"
            />
          </Box>
        )}
      </Box>
    </Box>
  );

  // ── RENDER MAP ─────────────────────────────────────────────────────────────
  const renderMap = () => (
    <Box sx={{ flex: 1, position: 'relative', height: '100%', bgcolor: '#FBF9F6' }}>
      <MapView 
        restaurants={results} 
        userLocation={location} 
        onMarkerClick={(id) => {
          setSelectedId(id);
          const element = document.getElementById(`restaurant-card-${id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }}
      />
      
      {/* Search this area button */}
      <Box sx={{ position: 'absolute', top: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
        <Button 
          variant="contained" 
          startIcon={<MyLocationIcon />}
          onClick={() => performSearch()}
          sx={{ 
            bgcolor: 'white', 
            color: 'text.primary', 
            borderRadius: 10,
            px: 4,
            py: 1.5,
            fontWeight: 900,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            '&:hover': { bgcolor: '#f5f5f5' }
          }}
        >
          Search this area
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ height: 'calc(100vh - 65px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {error && (
        <Alert severity="error" sx={{ mx: 2, mt: 2, borderRadius: 3 }}>{error}</Alert>
      )}
      
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {(!isMobile || mobileView === 'list') && renderSidebar()}
        {(!isMobile || mobileView === 'map') && renderMap()}
      </Box>

      {/* Mobile Toggle FAB */}
      {isMobile && (
        <Box sx={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <Fab 
            variant="extended" 
            color="primary" 
            onClick={() => setMobileView(mobileView === 'list' ? 'map' : 'list')}
            sx={{ px: 4, fontWeight: 900, boxShadow: '0 8px 32px rgba(216, 88, 48, 0.4)' }}
          >
            {mobileView === 'list' ? <MyLocationIcon sx={{ mr: 1 }} /> : <SearchIcon sx={{ mr: 1 }} />}
            {mobileView === 'list' ? 'Map' : 'List'}
          </Fab>
        </Box>
      )}
    </Box>
  );
}
