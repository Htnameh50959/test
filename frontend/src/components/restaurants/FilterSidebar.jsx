import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Rating,
  Select,
  Slider,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import {
  RestaurantMenu,
  AttachMoney,
  Star,
  Explore,
  FilterListOff,
  CleaningServices
} from '@mui/icons-material';

import {
  selectSearchFilters,
  setFilters,
  clearFilters
} from '@/redux/slices/restaurantsSlice';
import { CUISINE_TYPES } from '@/constants';

/**
 * FilterSidebar
 * 
 * Side panel for restaurant discovery filters.
 * Synchronized with Redux state.
 */
export const FilterSidebar = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const filters = useSelector(selectSearchFilters);

  const handleCuisineToggle = (cuisine) => {
    const newCuisines = filters.cuisineTypes.includes(cuisine)
      ? filters.cuisineTypes.filter((c) => c !== cuisine)
      : [...filters.cuisineTypes, cuisine];
    dispatch(setFilters({ cuisineTypes: newCuisines }));
  };

  const handlePriceChange = (e) => {
    dispatch(setFilters({ priceRange: e.target.value === 'all' ? [] : [Number(e.target.value)] }));
  };

  const handleDietaryToggle = (item) => {
    const newDietary = filters.dietary.includes(item)
      ? filters.dietary.filter((d) => d !== item)
      : [...filters.dietary, item];
    dispatch(setFilters({ dietary: newDietary }));
  };

  const sectionTitleSx = { 
    fontWeight: 700, 
    mb: 2, 
    display: 'flex', 
    alignItems: 'center', 
    gap: 1,
    color: 'text.primary',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 3, 
        borderRadius: 4, 
        bgcolor: 'white', 
        border: '1px solid',
        borderColor: 'divider',
        height: 'fit-content',
        position: 'sticky',
        top: 100
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight={800} sx={{ fontSize: '1.25rem' }}>Filters</Typography>
        <Button 
          size="small" 
          startIcon={<CleaningServices sx={{ fontSize: '1rem !important' }} />}
          onClick={() => dispatch(clearFilters())}
          sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
        >
          Clear
        </Button>
      </Box>

      {/* Cuisine Types */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={sectionTitleSx}>
          <RestaurantMenu sx={{ fontSize: 18, color: 'primary.main' }} /> Cuisine Types
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {CUISINE_TYPES.map((cuisine) => {
            const isSelected = filters.cuisineTypes.includes(cuisine);
            return (
              <Chip
                key={cuisine}
                label={cuisine}
                onClick={() => handleCuisineToggle(cuisine)}
                color={isSelected ? 'primary' : 'default'}
                variant={isSelected ? 'contained' : 'outlined'}
                sx={{ 
                  borderRadius: 2,
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'scale(1.05)' }
                }}
              />
            );
          })}
        </Box>
      </Box>

      {/* Price Range */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={sectionTitleSx}>
          <AttachMoney sx={{ fontSize: 18, color: theme.palette.success.main }} /> Price Range
        </Typography>
        <FormControl>
          <RadioGroup 
            value={filters.priceRange[0] || 'all'} 
            onChange={handlePriceChange}
          >
            <FormControlLabel value="all" control={<Radio size="small" />} label={<Typography variant="body2">Any price</Typography>} />
            <FormControlLabel value="1" control={<Radio size="small" />} label={<Typography variant="body2">$ (Budget)</Typography>} />
            <FormControlLabel value="2" control={<Radio size="small" />} label={<Typography variant="body2">$$ (Moderate)</Typography>} />
            <FormControlLabel value="3" control={<Radio size="small" />} label={<Typography variant="body2">$$$ (Expensive)</Typography>} />
            <FormControlLabel value="4" control={<Radio size="small" />} label={<Typography variant="body2">$$$$ (Luxury)</Typography>} />
          </RadioGroup>
        </FormControl>
      </Box>

      {/* Min Rating */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={sectionTitleSx}>
          <Star sx={{ fontSize: 18, color: '#F4A261' }} /> Minimum Rating
        </Typography>
        <Box sx={{ px: 1 }}>
          <Slider
            value={filters.minRating || 0}
            min={0}
            max={5}
            step={0.5}
            marks={[
              { value: 0, label: '0' },
              { value: 3, label: '3+' },
              { value: 4, label: '4+' },
              { value: 5, label: '5' },
            ]}
            onChange={(_, val) => dispatch(setFilters({ minRating: val }))}
            valueLabelDisplay="auto"
          />
        </Box>
      </Box>

      {/* Radius / Distance */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={sectionTitleSx}>
          <Explore sx={{ fontSize: 18, color: theme.palette.info.main }} /> Max Distance
        </Typography>
        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
          <Select
            value={filters.radius || 5000}
            onChange={(e) => dispatch(setFilters({ radius: e.target.value }))}
            displayEmpty
          >
            <MenuItem value={1000}>&lt; 1km</MenuItem>
            <MenuItem value={3000}>&lt; 3km</MenuItem>
            <MenuItem value={5000}>&lt; 5km</MenuItem>
            <MenuItem value={10000}>&lt; 10km</MenuItem>
            <MenuItem value={20000}>&lt; 20km</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Dietary Features */}
      <Box>
        <Typography sx={sectionTitleSx}>Dietary Preference</Typography>
        <FormGroup>
          {['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Organic'].map((item) => (
            <FormControlLabel
              key={item}
              control={
                <Checkbox 
                  size="small" 
                  checked={filters.dietary.includes(item)}
                  onChange={() => handleDietaryToggle(item)}
                />
              }
              label={<Typography variant="body2">{item}</Typography>}
            />
          ))}
        </FormGroup>
      </Box>
    </Paper>
  );
};
