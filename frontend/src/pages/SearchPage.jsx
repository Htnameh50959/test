import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Grid, Typography, Stack,
  Drawer, Divider, Chip, IconButton, Button, Fab,
  FormControl, Select, MenuItem, InputBase, Paper,
  Slider, Rating, Pagination, CircularProgress,
  ToggleButtonGroup, ToggleButton, Badge, alpha,
  useTheme, useMediaQuery, Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Map as MapIcon,
  ViewList as ListIcon,
  MyLocation as MyLocationIcon,
  Close as CloseIcon,
  Tune as TuneIcon,
  Star as StarIcon,
  AccessTime as TimeIcon,
  WifiOff as OfflineIcon,
} from '@mui/icons-material';

import {
  searchRestaurants,
  selectSearchResults,
  selectSearchFilters,
  selectSearchPagination,
  selectRestaurantsLoading,
  selectRestaurantsError,
  setFilters,
  clearFilters,
} from '@/redux/slices/restaurantsSlice';
import { useGeolocation } from '@/hooks/useGeolocation';
import { CUISINE_TYPES, PRICE_RANGES, SORT_OPTIONS } from '@/constants';
import { RestaurantCard, RestaurantSkeleton } from '@/components/restaurants/RestaurantCard';
import { MapView } from '@/components/restaurants/MapView';

const CUISINE_ICONS = {
  Indian: '🍛', 'North Indian': '🫓', 'South Indian': '🥘', Chinese: '🥢',
  Italian: '🍝', Mexican: '🌮', Thai: '🍜', Japanese: '🍣',
  American: '🍔', Mediterranean: '🫒', Biryani: '🍚', Pizza: '🍕',
  Burger: '🍔', Desserts: '🍰', Beverages: '🥤',
};

const OPEN_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'true', label: 'Open Now' },
];

export default function SearchPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const theme     = useTheme();
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();

  const results    = useSelector(selectSearchResults);
  const filters    = useSelector(selectSearchFilters);
  const loading    = useSelector(selectRestaurantsLoading);
  const error      = useSelector(selectRestaurantsError);
  const pagination = useSelector(selectSearchPagination);

  const { location, loading: geoLoading, requestLocation } = useGeolocation({ autoRequest: true });

  const queryFromUrl  = searchParams.get('q') || '';
  const [localQuery,  setLocalQuery]  = useState(queryFromUrl);
  const [view,        setView]        = useState('list');       // 'list' | 'map'
  const [sort,        setSort]        = useState('relevance');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId,  setSelectedId]  = useState(null);
  const [page,        setPage]        = useState(1);

  // Local filter state (applied on demand)
  const [localFilters, setLocalFilters] = useState({
    cuisineTypes: [],
    priceRange:   [],
    minRating:    0,
    isOpen:       '',
  });

  const activeFilterCount = [
    ...(localFilters.cuisineTypes.length ? [1] : []),
    ...(localFilters.priceRange.length   ? [1] : []),
    ...(localFilters.minRating > 0       ? [1] : []),
    ...(localFilters.isOpen              ? [1] : []),
  ].length;

  const performSearch = useCallback((overridePage = page) => {
    const params = {
      q:      queryFromUrl || undefined,
      sort,
      limit:  20,
      skip:   (overridePage - 1) * 20,
      ...(localFilters.cuisineTypes.length && { cuisineTypes: localFilters.cuisineTypes }),
      ...(localFilters.priceRange.length   && { priceRange:   localFilters.priceRange   }),
      ...(localFilters.minRating > 0       && { minRating:    localFilters.minRating    }),
      ...(localFilters.isOpen              && { isOpen:       localFilters.isOpen        }),
      ...(location?.lat && location?.lng   && { lat: location.lat, lng: location.lng, radius: 2500000 }),
    };

    dispatch(searchRestaurants(params));
  }, [dispatch, queryFromUrl, sort, localFilters, location, page]);

  useEffect(() => {
    if (!geoLoading) performSearch(1);
    setPage(1);
  }, [geoLoading, queryFromUrl, sort, localFilters, location?.lat, location?.lng]);

  useEffect(() => { setLocalQuery(queryFromUrl); }, [queryFromUrl]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams(localQuery ? { q: localQuery } : {});
  };

  const handlePageChange = (_, newPage) => {
    setPage(newPage);
    performSearch(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMarkerClick = (id) => {
    setSelectedId(id);
    if (isMobile) setView('list');
    setTimeout(() => {
      const el = document.getElementById(`card-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const applyFilters = () => {
    dispatch(setFilters(localFilters));
    setFiltersOpen(false);
  };

  const resetFilters = () => {
    setLocalFilters({ cuisineTypes: [], priceRange: [], minRating: 0, isOpen: '' });
    dispatch(clearFilters());
  };

  const toggleCuisine = (c) => {
    setLocalFilters(prev => ({
      ...prev,
      cuisineTypes: prev.cuisineTypes.includes(c)
        ? prev.cuisineTypes.filter(x => x !== c)
        : [...prev.cuisineTypes, c],
    }));
  };

  const togglePrice = (p) => {
    setLocalFilters(prev => ({
      ...prev,
      priceRange: prev.priceRange.includes(p)
        ? prev.priceRange.filter(x => x !== p)
        : [...prev.priceRange, p],
    }));
  };

  // ── FILTER DRAWER ──────────────────────────────────────────────────────────
  const FilterPanel = () => (
    <Box sx={{ p: 3, width: { xs: '100vw', sm: 360 }, maxWidth: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={900}>Filters</Typography>
        <IconButton onClick={() => setFiltersOpen(false)} size="small"><CloseIcon /></IconButton>
      </Box>

      {/* Cuisine Types */}
      <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.7rem' }}>
        Cuisine Type
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
        {CUISINE_TYPES.map((c) => (
          <Chip
            key={c}
            label={`${CUISINE_ICONS[c] || '🍽'} ${c}`}
            onClick={() => toggleCuisine(c)}
            variant={localFilters.cuisineTypes.includes(c) ? 'filled' : 'outlined'}
            color={localFilters.cuisineTypes.includes(c) ? 'primary' : 'default'}
            sx={{ fontWeight: 700, borderRadius: 2, fontSize: '0.8rem' }}
          />
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Price Range */}
      <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.7rem' }}>
        Price Range
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {PRICE_RANGES.map((p) => (
          <Chip
            key={p.value}
            label={p.icon}
            onClick={() => togglePrice(p.value)}
            variant={localFilters.priceRange.includes(p.value) ? 'filled' : 'outlined'}
            color={localFilters.priceRange.includes(p.value) ? 'primary' : 'default'}
            sx={{ fontWeight: 900, borderRadius: 2, minWidth: 56 }}
          />
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Min Rating */}
      <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.7rem', mb: 1.5 }}>
        Minimum Rating
      </Typography>
      <Box sx={{ px: 1 }}>
        <Rating
          value={localFilters.minRating}
          onChange={(_, v) => setLocalFilters(prev => ({ ...prev, minRating: v || 0 }))}
          precision={0.5}
          size="large"
          sx={{ mb: 0.5 }}
        />
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          {localFilters.minRating > 0 ? `${localFilters.minRating}★ and above` : 'Any rating'}
        </Typography>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Open Now */}
      <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary" sx={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: '0.7rem' }}>
        Availability
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {OPEN_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            label={o.label}
            onClick={() => setLocalFilters(prev => ({ ...prev, isOpen: o.value }))}
            variant={localFilters.isOpen === o.value ? 'filled' : 'outlined'}
            color={localFilters.isOpen === o.value ? 'primary' : 'default'}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button fullWidth variant="outlined" onClick={resetFilters} sx={{ fontWeight: 800, borderRadius: 3 }}>
          Reset
        </Button>
        <Button fullWidth variant="contained" onClick={applyFilters} sx={{ fontWeight: 800, borderRadius: 3 }}>
          Apply Filters
        </Button>
      </Box>
    </Box>
  );

  // ── MAIN RENDER ─────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>

      {/* ── TOP SEARCH BAR ──────────────────────────────────────────────────── */}
      <Box sx={{
        bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider',
        px: { xs: 2, md: 4 }, py: 2, display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, zIndex: 10,
      }}>
        <Paper
          component="form"
          onSubmit={handleSearch}
          elevation={0}
          sx={{
            display: 'flex', alignItems: 'center', flex: 1,
            bgcolor: '#F5F5F5', borderRadius: 4, px: 2, py: 1,
            border: '1px solid', borderColor: 'divider',
          }}
        >
          <SearchIcon sx={{ color: 'text.secondary', mr: 1.5, fontSize: 20 }} />
          <InputBase
            placeholder="Search restaurants, dishes, cuisines..."
            fullWidth
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            sx={{ fontWeight: 600, fontSize: '0.95rem' }}
          />
          {localQuery && (
            <IconButton size="small" onClick={() => { setLocalQuery(''); setSearchParams({}); }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </Paper>

        {/* Sort */}
        <FormControl size="small" sx={{ minWidth: 160, display: { xs: 'none', sm: 'block' } }}>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            displayEmpty
            sx={{ fontWeight: 700, borderRadius: 3, bgcolor: '#F5F5F5', '& .MuiOutlinedInput-notchedOutline': { border: 'none' } }}
          >
            {SORT_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value} sx={{ fontWeight: 700 }}>{o.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Filter button */}
        <Badge badgeContent={activeFilterCount} color="primary">
          <Button
            variant={activeFilterCount > 0 ? 'contained' : 'outlined'}
            startIcon={<TuneIcon />}
            onClick={() => setFiltersOpen(true)}
            sx={{ fontWeight: 800, borderRadius: 3, whiteSpace: 'nowrap', px: { xs: 2, md: 3 } }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>Filters</Box>
          </Button>
        </Badge>

        {/* View toggle */}
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(_, v) => v && setView(v)}
          size="small"
          sx={{ '& .MuiToggleButton-root': { borderRadius: 2, border: '1px solid', borderColor: 'divider', px: 1.5 } }}
        >
          <ToggleButton value="list"><ListIcon fontSize="small" /></ToggleButton>
          <ToggleButton value="map"><MapIcon fontSize="small" /></ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* ── ACTIVE FILTERS ROW ──────────────────────────────────────────────── */}
      {(localFilters.cuisineTypes.length > 0 || localFilters.priceRange.length > 0 || localFilters.minRating > 0 || localFilters.isOpen) && (
        <Box sx={{ bgcolor: 'white', px: { xs: 2, md: 4 }, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ mr: 1 }}>Active:</Typography>
          {localFilters.cuisineTypes.map(c => (
            <Chip key={c} size="small" label={c} onDelete={() => toggleCuisine(c)} sx={{ fontWeight: 700, borderRadius: 2 }} />
          ))}
          {localFilters.priceRange.map(p => (
            <Chip key={p} size="small" label={p} onDelete={() => togglePrice(p)} sx={{ fontWeight: 700, borderRadius: 2 }} />
          ))}
          {localFilters.minRating > 0 && (
            <Chip size="small" label={`${localFilters.minRating}★+`} onDelete={() => setLocalFilters(f => ({ ...f, minRating: 0 }))} sx={{ fontWeight: 700, borderRadius: 2 }} />
          )}
          {localFilters.isOpen && (
            <Chip size="small" label="Open Now" onDelete={() => setLocalFilters(f => ({ ...f, isOpen: '' }))} sx={{ fontWeight: 700, borderRadius: 2 }} />
          )}
          <Button size="small" onClick={resetFilters} sx={{ fontWeight: 800, ml: 'auto', color: 'text.secondary' }}>
            Clear all
          </Button>
        </Box>
      )}

      {/* ── BODY ────────────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LIST PANEL */}
        {(!isMobile || view === 'list') && (
          <Box sx={{
            width: view === 'list' ? '100%' : { md: 480, lg: 560 },
            overflowY: 'auto',
            bgcolor: '#FAFAFA',
            borderRight: view === 'map' ? '1px solid' : 'none',
            borderColor: 'divider',
            display: 'flex', flexDirection: 'column',
          }}>
            <Box sx={{ px: { xs: 2, md: 3 }, pt: 3, pb: 1.5 }}>
              <Typography variant="body2" fontWeight={800} color="text.secondary">
                {loading
                  ? 'Searching...'
                  : `${pagination.total || results.length} restaurant${(pagination.total || results.length) !== 1 ? 's' : ''} found${location?.lat ? ' nearby' : ''}`}
              </Typography>
            </Box>

            <Box sx={{ px: { xs: 2, md: 3 }, pb: 4, flex: 1 }}>
              {view === 'list' ? (
                /* Grid view when full width */
                <Grid container spacing={3}>
                  {loading && results.length === 0
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={i}>
                          <RestaurantSkeleton />
                        </Grid>
                      ))
                    : results.map((r) => (
                        <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={r._id} id={`card-${r._id}`}>
                          <Box sx={{
                            transition: 'all 0.3s',
                            outline: selectedId === r._id ? `3px solid ${theme.palette.primary.main}` : 'none',
                            outlineOffset: 3, borderRadius: 4,
                          }}>
                            <RestaurantCard restaurant={r} />
                          </Box>
                        </Grid>
                      ))
                  }
                </Grid>
              ) : (
                /* Stack view when split with map */
                <Stack spacing={3}>
                  {loading && results.length === 0
                    ? Array.from({ length: 4 }).map((_, i) => <RestaurantSkeleton key={i} />)
                    : results.map((r) => (
                        <Box key={r._id} id={`card-${r._id}`} sx={{
                          transition: 'all 0.3s',
                          outline: selectedId === r._id ? `3px solid ${theme.palette.primary.main}` : 'none',
                          outlineOffset: 3, borderRadius: 4,
                        }}>
                          <RestaurantCard restaurant={r} />
                        </Box>
                      ))
                  }
                </Stack>
              )}

              {/* Empty state */}
              {!loading && results.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 12 }}>
                  <Typography variant="h2" sx={{ mb: 2 }}>🥘</Typography>
                  <Typography variant="h5" fontWeight={900} gutterBottom>No restaurants found</Typography>
                  <Typography color="text.secondary" sx={{ mb: 3 }}>
                    {activeFilterCount > 0 ? 'Try removing some filters.' : 'No restaurants match your search.'}
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    {activeFilterCount > 0 && (
                      <Button variant="outlined" onClick={resetFilters} sx={{ fontWeight: 800, borderRadius: 3 }}>
                        Clear Filters
                      </Button>
                    )}
                    <Button variant="contained" onClick={() => { setLocalQuery(''); setSearchParams({}); }} sx={{ fontWeight: 800, borderRadius: 3 }}>
                      Show All
                    </Button>
                  </Stack>
                </Box>
              )}

              {/* Pagination */}
              {pagination.pages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                  <Pagination
                    count={pagination.pages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* MAP PANEL */}
        {(!isMobile || view === 'map') && (
          <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}>
            <MapView
              restaurants={results}
              userLocation={location}
              onMarkerClick={handleMarkerClick}
            />

            {/* Refresh location button */}
            <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 10 }}>
              <Tooltip title="Use my location">
                <Fab
                  size="small"
                  color="primary"
                  onClick={requestLocation}
                  sx={{ boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
                >
                  <MyLocationIcon fontSize="small" />
                </Fab>
              </Tooltip>
            </Box>

            {loading && (
              <Box sx={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
                <Paper sx={{ px: 3, py: 1.5, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 1.5, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" fontWeight={700}>Searching...</Typography>
                </Paper>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* ── MOBILE VIEW TOGGLE FAB ──────────────────────────────────────────── */}
      {isMobile && (
        <Box sx={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
          <Fab
            variant="extended"
            color="primary"
            onClick={() => setView(v => v === 'list' ? 'map' : 'list')}
            sx={{ px: 4, fontWeight: 900, boxShadow: '0 8px 32px rgba(216,88,48,0.4)', gap: 1 }}
          >
            {view === 'list' ? <><MapIcon /> Map</> : <><ListIcon /> List</>}
          </Fab>
        </Box>
      )}

      {/* ── FILTER DRAWER ───────────────────────────────────────────────────── */}
      <Drawer anchor="right" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <FilterPanel />
      </Drawer>
    </Box>
  );
}
