import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Box, Typography, Grid, Paper, Stack, Button, IconButton, 
  CircularProgress, Alert, Tooltip, MenuItem, Select, FormControl, 
  InputLabel, Divider, Card, CardContent, Chip, Rating,
  useTheme, useMediaQuery, Fade, Zoom
} from '@mui/material';
import {
  FileDownload, FilterList, TrendingUp, Group, ShoppingCart, 
  Star, AccessTime, Assessment, Replay, Insights,
  Restaurant, ThumbUp, SentimentVerySatisfied, SentimentNeutral, SentimentVeryDissatisfied
} from '@mui/icons-material';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

import MerchantLayout from '@/components/layout/MerchantLayout';
import { 
  fetchSalesAnalytics, fetchPopularItems, fetchPeakHours, 
  fetchReviewSentiment
} from '@/redux/slices/merchantSlice';
import { formatCurrency } from '@/utils/formatters';

const SENTIMENT_COLORS = {
  positive: '#4CAF50',
  neutral: '#FF9800',
  negative: '#F44336'
};

// ── Sub-Components ───────────────────────────────────────────────────────────

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
  <Paper 
    elevation={0} 
    sx={{ 
      p: 3, borderRadius: 6, border: '1px solid rgba(0,0,0,0.06)', 
      bgcolor: 'white', position: 'relative', overflow: 'hidden',
      height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center'
    }}
  >
    <Box sx={{ 
      position: 'absolute', top: -10, right: -10, p: 4, 
      bgcolor: `${color}.main`, opacity: 0.05, borderRadius: '50%' 
    }} />
    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
      <Box sx={{ 
        p: 1.5, borderRadius: 4, bgcolor: `${color}.main`, color: 'white',
        boxShadow: `0 8px 16px rgba(0,0,0,0.1)`
      }}>
        <Icon />
      </Box>
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={900}>{title}</Typography>
        <Typography variant="h4" fontWeight={1000} sx={{ letterSpacing: -1 }}>{value}</Typography>
      </Box>
    </Stack>
    {subtitle && <Typography variant="caption" color="text.secondary" fontWeight={700}>{subtitle}</Typography>}
  </Paper>
);

const SalesTrendChart = ({ data }) => {
  const theme = useTheme();
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
        <XAxis 
          dataKey="period" 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontWeight: 800, fontSize: 11 }}
        />
        <YAxis 
          axisLine={false} 
          tickLine={false} 
          tick={{ fontWeight: 800, fontSize: 11 }}
          tickFormatter={(val) => `₹${val}`}
        />
        <RechartsTooltip 
          contentStyle={{ 
            borderRadius: 16, border: 'none', 
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            padding: 16
          }} 
          formatter={(val) => [formatCurrency(val), 'Revenue']}
        />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke={theme.palette.primary.main} 
          strokeWidth={4} 
          dot={{ r: 6, fill: theme.palette.primary.main, strokeWidth: 3, stroke: 'white' }}
          activeDot={{ r: 8, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

const PeakHoursHeatmap = ({ data }) => {
  if (!data) return null;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 10 PM

  return (
    <Box sx={{ mt: 2, overflowX: 'auto' }}>
      <Box sx={{ minWidth: 600 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', mb: 1 }}>
          <Box sx={{ width: 60 }} />
          {days.map(day => (
            <Box key={day} sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="caption" fontWeight={900} color="text.secondary">{day}</Typography>
            </Box>
          ))}
        </Box>
        
        {/* Rows */}
        {hours.map(hour => (
          <Box key={hour} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            <Box sx={{ width: 60, textAlign: 'right', pr: 2 }}>
              <Typography variant="caption" fontWeight={800} color="text.disabled">
                {hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </Typography>
            </Box>
            {days.map(day => {
              const val = data[day]?.[hour]?.orders || 0;
              const intensity = Math.min(val / 10, 1);
              return (
                <Tooltip key={`${day}-${hour}`} title={`${val} orders at ${hour}:00 on ${day}`} arrow>
                  <Box 
                    sx={{ 
                      flex: 1, height: 24, mx: 0.25, borderRadius: 1,
                      bgcolor: val > 0 ? `rgba(216, 88, 48, ${0.1 + intensity * 0.9})` : 'rgba(0,0,0,0.03)',
                      transition: '0.2s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      '&:hover': { transform: 'scale(1.1)', zIndex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
                    }}
                  >
                   {val > 2 && <Typography sx={{ fontSize: 9, fontWeight: 900, color: intensity > 0.6 ? 'white' : 'primary.main' }}>{val}</Typography>}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

// ── Main Dashboard ───────────────────────────────────────────────────────────

export default function MerchantAnalytics() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { sales, popular, peak, sentiment, error } = useSelector(state => state.merchant.analytics);
  const [range, setRange] = useState('30'); // '7', '30', '90'

  useEffect(() => {
    const params = { days: range };
    dispatch(fetchSalesAnalytics(params));
    dispatch(fetchPopularItems(params));
    dispatch(fetchPeakHours(params));
    dispatch(fetchReviewSentiment(params));
  }, [dispatch, range]);

  const handleRefresh = () => {
    const params = { days: range };
    dispatch(fetchSalesAnalytics(params));
    dispatch(fetchPopularItems(params));
    dispatch(fetchPeakHours(params));
    dispatch(fetchReviewSentiment(params));
  };

  const handleExportCSV = () => {
    if (!sales.data) return;
    const headers = ['Period', 'Revenue', 'Orders', 'Avg Order Value'];
    const rows = sales.data.timeSeries.map(d => [d.period, d.revenue, d.orders, d.avgOrder]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `merchant_analytics_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const radarData = useMemo(() => {
    if (!sentiment.data?.categoryAverages) return [];
    const cat = sentiment.data.categoryAverages;
    return [
      { subject: 'Food', A: cat.food, fullMark: 5 },
      { subject: 'Service', A: cat.service, fullMark: 5 },
      { subject: 'Ambiance', A: cat.ambiance, fullMark: 5 },
      { subject: 'Value', A: cat.value, fullMark: 5 },
      { subject: 'Delivery', A: cat.delivery, fullMark: 5 }
    ];
  }, [sentiment.data]);

  const pieData = useMemo(() => {
    if (!sentiment.data?.sentimentDistribution) return [];
    const dist = sentiment.data.sentimentDistribution;
    return [
      { name: 'Positive', value: dist.positive, color: SENTIMENT_COLORS.positive },
      { name: 'Neutral', value: dist.neutral, color: SENTIMENT_COLORS.neutral },
      { name: 'Negative', value: dist.negative, color: SENTIMENT_COLORS.negative }
    ];
  }, [sentiment.data]);

  const isLoading = sales.loading || popular.loading || peak.loading || sentiment.loading;

  return (
    <MerchantLayout>
      {/* ── HEADER ────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 3, mb: 6 }}>
        <Box>
           <Typography variant="h4" fontWeight={1000} sx={{ letterSpacing: -1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
             <Assessment color="primary" sx={{ fontSize: 36 }} />
             Business <Box component="span" sx={{ color: 'primary.main', fontWeight: 400, fontStyle: 'italic' }}>Intelligence</Box>
           </Typography>
           <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Deep-dive into your growth, customer sentiment, and peak performance.</Typography>
        </Box>
        <Stack direction="row" spacing={2} sx={{ width: { xs: '100%', sm: 'auto' } }}>
           <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                sx={{ borderRadius: 10, bgcolor: 'white', fontWeight: 900 }}
                startAdornment={<FilterList sx={{ mr: 1, fontSize: 18, opacity: 0.6 }} />}
              >
                <MenuItem value="7">Last 7 Days</MenuItem>
                <MenuItem value="30">Last 30 Days</MenuItem>
                <MenuItem value="90">Last 90 Days</MenuItem>
              </Select>
           </FormControl>
           <IconButton onClick={handleRefresh} sx={{ bgcolor: 'white', border: '1px solid rgba(0,0,0,0.1)' }}>
             <Replay />
           </IconButton>
           <Button 
             variant="contained" 
             startIcon={<FileDownload />} 
             onClick={handleExportCSV}
             sx={{ 
               borderRadius: 10, px: 4, fontWeight: 900,
               boxShadow: '0 8px 24px rgba(216, 88, 48, 0.2)'
             }}
           >
             Export
           </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 4, borderRadius: 4 }}>{error}</Alert>}

      {/* ── STATS OVERVIEW ────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>

          <StatCard 
            title="TOTAL REVENUE" 
            value={sales.data ? formatCurrency(sales.data.totals.revenue) : '₹0'} 
            subtitle="Confirmed & Delivered"
            icon={TrendingUp} 
            color="primary"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>

          <StatCard 
            title="ORDER VOLUME" 
            value={sales.data ? sales.data.totals.orders : '0'} 
            subtitle="Across selected period"
            icon={ShoppingCart} 
            color="success"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>

          <StatCard 
            title="AVG ORDER VALUE" 
            value={sales.data ? formatCurrency(sales.data.totals.avgOrder) : '₹0'} 
            subtitle="Per successful checkout"
            icon={Group} 
            color="info"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>

          <StatCard 
            title="CUSTOMER SATISFACTION" 
            value={sentiment.data ? `${sentiment.data.overview.avgRating}/5` : '0/5'} 
            subtitle={`${sentiment.data?.overview?.totalReviews || 0} Total Reviews`}
            icon={Star} 
            color="warning"
          />
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* ── SALES TREND ──────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, lg: 8 }}>

          <Paper elevation={0} sx={{ p: 4, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white', height: '100%' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>

              <Box>
                <Typography variant="h6" fontWeight={1000} sx={{ letterSpacing: -0.5 }}>Financial Growth</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Daily revenue trajectories</Typography>
              </Box>
              <Chip icon={<Insights />} label="Live Sync" size="small" sx={{ fontWeight: 900, borderRadius: 1.5 }} color="primary" variant="outlined" />
            </Stack>
            <Box sx={{ height: 320 }}>
              {sales.loading ? <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box> : <SalesTrendChart data={sales.data?.timeSeries || []} />}
            </Box>
          </Paper>
        </Grid>

        {/* ── POPULAR ITEMS ────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, lg: 4 }}>

          <Paper elevation={0} sx={{ p: 4, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white', height: '100%' }}>
             <Typography variant="h6" fontWeight={1000} sx={{ mb: 0.5, letterSpacing: -0.5 }}>Top Sellers</Typography>
             <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 4 }}>Highest contributing dishes</Typography>
             
             <Stack spacing={3}>
                {(popular.data?.items?.slice(0, 5) || []).map((item, idx) => (
                  <Box key={item.menuItemId}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>

                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900 }}>
                          {idx + 1}
                        </Box>
                        <Typography variant="body2" fontWeight={800}>{item.name}</Typography>
                      </Stack>
                      <Typography variant="body2" fontWeight={1000}>{item.totalSold} sold</Typography>
                    </Stack>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1, height: 6, bgcolor: 'rgba(0,0,0,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                        <Box sx={{ width: item.revenueShare, height: '100%', bgcolor: 'primary.main', borderRadius: 3 }} />
                      </Box>
                      <Typography variant="caption" fontWeight={900} color="text.secondary">{item.revenueShare}</Typography>
                    </Box>
                  </Box>
                ))}
                {!popular.data?.items?.length && !popular.loading && <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', py: 4, textAlign: 'center' }}>No sales data for this period.</Typography>}
             </Stack>
          </Paper>
        </Grid>

        {/* ── PEAK HOURS ───────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, lg: 7 }}>

          <Paper elevation={0} sx={{ p: 4, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>

              <Box>
                <Typography variant="h6" fontWeight={1000} sx={{ letterSpacing: -0.5 }}>Kitchen Flow</Typography>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>Heatmap by hour and weekday</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 <Typography variant="caption" fontWeight={900} color="text.secondary">Intensity</Typography>
                 <Box sx={{ width: 60, height: 8, borderRadius: 4, background: 'linear-gradient(90deg, rgba(216, 88, 48, 0.1) 0%, rgba(216, 88, 48, 1) 100%)' }} />
              </Box>
            </Stack>
            {peak.loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress /></Box> : <PeakHoursHeatmap data={peak.data?.heatmap} />}
            
            {peak.data?.peakSlot && (
              <Box sx={{ mt: 4, p: 2, borderRadius: 4, bgcolor: 'rgba(216, 88, 48, 0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
                <AccessTime color="primary" />
                <Typography variant="body2" fontWeight={700}>
                  Your busiest window is <Box component="span" sx={{ color: 'primary.main', fontWeight: 1000 }}>{peak.data.peakSlot.weekday}s at {peak.data.peakSlot.hour > 12 ? `${peak.data.peakSlot.hour - 12} PM` : `${peak.data.peakSlot.hour} AM`}</Box> with an average of {peak.data.peakSlot.orders} orders.
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* ── REVIEW INSIGHTS ──────────────────────────────────────────── */}
        <Grid size={{ xs: 12, lg: 5 }}>

          <Paper elevation={0} sx={{ p: 4, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white', height: '100%' }}>
             <Typography variant="h6" fontWeight={1000} sx={{ mb: 4, letterSpacing: -0.5 }}>Sentiment Analysis</Typography>
             
             <Grid container spacing={3}>
                <Grid size={{ xs: 5 }}>

                   <Box sx={{ textAlign: 'center' }}>
                      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
                        <CircularProgress 
                          variant="determinate" 
                          value={sentiment.data ? (sentiment.data.overview.avgSentiment + 1) * 50 : 0} 
                          size={100} 
                          thickness={6}
                          sx={{ color: sentiment.data?.overview.sentimentLabel === 'positive' ? 'success.main' : 'warning.main' }}
                        />
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Typography variant="h6" fontWeight={1000}>{sentiment.data?.overview.sentimentLabel === 'positive' ? '😊' : '😐'}</Typography>
                        </Box>
                      </Box>
                      <Typography variant="caption" display="block" fontWeight={900} color="text.secondary">OVERALL VIBE</Typography>
                      <Typography variant="subtitle1" fontWeight={1000} sx={{ textTransform: 'uppercase', color: sentiment.data?.overview.sentimentLabel === 'positive' ? 'success.main' : 'warning.main' }}>
                        {sentiment.data?.overview.sentimentLabel || 'N/A'}
                      </Typography>
                   </Box>
                </Grid>
                <Grid size={{ xs: 7 }}>

                  <Box sx={{ height: 160 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Grid>
             </Grid>

             <Typography variant="subtitle2" fontWeight={900} sx={{ mt: 4, mb: 2 }}>Category Breakdown</Typography>
             <Box sx={{ height: 280, mt: -2 }}>
                <ResponsiveContainer width="100%" height="100%">
                   <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="rgba(0,0,0,0.05)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontWeight: 900, fontSize: 11 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
                      <Radar
                         name="Rating"
                         dataKey="A"
                         stroke={theme.palette.primary.main}
                         fill={theme.palette.primary.main}
                         fillOpacity={0.4}
                      />
                   </RadarChart>
                </ResponsiveContainer>
             </Box>
          </Paper>
        </Grid>

        {/* ── KEYWORDS WORD CLOUD ───────────────────────────────────────── */}
        <Grid size={{ xs: 12 }}>

           <Paper elevation={0} sx={{ p: 4, borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', bgcolor: 'white' }}>
              <Typography variant="h6" fontWeight={1000} sx={{ mb: 4, letterSpacing: -1 }}>Voice of the Customer <Box component="span" sx={{ color: 'primary.main', opacity: 0.5 }}>•</Box> Trending Keywords</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                 {(sentiment.data?.trendingKeywords || []).map((word, idx) => (
                   <Chip 
                     key={word.term}
                     label={word.term}
                     sx={{ 
                       fontWeight: 1000, 
                       height: 32 + (word.weight * 20),
                       px: 2,
                       borderRadius: 4,
                       fontSize: 12 + (word.weight * 10),
                       color: idx % 3 === 0 ? 'primary.main' : 'text.primary',
                       bgcolor: idx % 3 === 0 ? 'rgba(216, 88, 48, 0.05)' : 'rgba(0,0,0,0.03)',
                       border: idx % 3 === 0 ? '1px solid rgba(216, 88, 48, 0.1)' : 'none',
                       transition: '0.3s',
                       '&:hover': { transform: 'scale(1.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }
                     }}
                   />
                 ))}
                 {!sentiment.data?.trendingKeywords?.length && <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic', py: 4 }}>No enough reviews to extract keywords.</Typography>}
              </Box>
           </Paper>
        </Grid>
      </Grid>
    </MerchantLayout>
  );
}
