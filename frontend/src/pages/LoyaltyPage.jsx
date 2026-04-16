import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Box, Button, Chip, CircularProgress, Container, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Grid, IconButton,
  LinearProgress, Paper, Skeleton, Stack, Tooltip, Typography, alpha,
} from '@mui/material';
import {
  Close, Diamond, EmojiEvents, LocalOffer, Redeem,
  Star, TrendingUp, WorkspacePremium,
} from '@mui/icons-material';
import { fetchLoyalty, redeemPoints, clearRedeemSuccess, clearLoyaltyError, selectLoyalty, selectLoyaltyLoading, selectRedeemSuccess } from '@/redux/slices/loyaltySlice';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';

const TIERS = {
  bronze:   { label: 'Bronze',   color: '#CD7F32', bg: '#FFF8EE', icon: '🥉', min: 0,     next: 1000 },
  silver:   { label: 'Silver',   color: '#9E9E9E', bg: '#F5F5F5', icon: '🥈', min: 1000,  next: 5000 },
  gold:     { label: 'Gold',     color: '#FFD700', bg: '#FFFBEA', icon: '🥇', min: 5000,  next: 10000 },
  platinum: { label: 'Platinum', color: '#7C3AED', bg: '#F5F3FF', icon: '💎', min: 10000, next: null },
};

const REWARDS = [
  { points: 100, label: '₹10 Discount', icon: '🎟️', desc: 'Instantly credited to checkout' },
  { points: 250, label: '₹25 Discount', icon: '💰', desc: 'Apply to any order' },
  { points: 500, label: '₹50 Discount', icon: '🎁', desc: 'Best value reward' },
  { points: 1000, label: '₹100 Discount', icon: '🏆', desc: 'Premium reward for top fans' },
];

const TierBadge = ({ tier, active = false }) => {
  const t = TIERS[tier] || TIERS.bronze;
  return (
    <Box sx={{ textAlign: 'center', opacity: active ? 1 : 0.4, transition: 'all 0.3s' }}>
      <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: active ? t.bg : 'grey.100', border: `3px solid ${active ? t.color : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 0.5, boxShadow: active ? `0 4px 20px ${alpha(t.color, 0.3)}` : 'none', transition: 'all 0.3s' }}>
        <Typography sx={{ fontSize: 32 }}>{t.icon}</Typography>
      </Box>
      <Typography variant="caption" fontWeight={active ? 800 : 500} sx={{ color: active ? t.color : 'text.secondary' }}>{t.label}</Typography>
      {active && <Typography variant="caption" sx={{ display: 'block', color: t.color, fontWeight: 600 }}>Current</Typography>}
    </Box>
  );
};

export default function LoyaltyPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loyalty = useSelector(selectLoyalty);
  const loading = useSelector(selectLoyaltyLoading);
  const redeemSuccess = useSelector(selectRedeemSuccess);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [redeemDialog, setRedeemDialog] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    dispatch(fetchLoyalty());
  }, [dispatch, isAuthenticated, navigate]);

  const tierInfo = loyalty ? (TIERS[loyalty.tier] || TIERS.bronze) : TIERS.bronze;

  const progressPct = loyalty
    ? loyalty.nextTier
      ? Math.min(100, ((loyalty.totalEarned - TIERS[loyalty.tier]?.min) / (loyalty.pointsToNext + loyalty.totalEarned - TIERS[loyalty.tier]?.min)) * 100)
      : 100
    : 0;

  const handleRedeemOpen = (reward) => {
    setSelectedReward(reward);
    dispatch(clearRedeemSuccess());
    setRedeemDialog(true);
  };

  const handleRedeem = async () => {
    if (!selectedReward) return;
    setRedeeming(true);
    await dispatch(redeemPoints(selectedReward.points));
    setRedeeming(false);
    dispatch(fetchLoyalty());
  };

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Hero */}
      <Box sx={{ background: `linear-gradient(135deg, ${tierInfo.color}22 0%, ${tierInfo.color}11 100%)`, borderBottom: `1px solid ${alpha(tierInfo.color, 0.2)}`, py: 6 }}>
        <Container maxWidth="md">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
            <EmojiEvents sx={{ color: tierInfo.color, fontSize: 32 }} />
            <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Loyalty & Rewards</Typography>
          </Stack>
          <Typography color="text.secondary">Earn points on every order and unlock exclusive rewards.</Typography>
        </Container>
      </Box>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {loading && !loyalty ? (
          <Grid container spacing={3}>
            {[1, 2].map(i => <Grid key={i} size={{ xs: 12, sm: 6 }}><Skeleton height={200} sx={{ borderRadius: 4, transform: 'none' }} /></Grid>)}
          </Grid>
        ) : loyalty ? (
          <Grid container spacing={3}>
            {/* Points Card */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: 5, background: `linear-gradient(135deg, ${tierInfo.color} 0%, ${alpha(tierInfo.color, 0.7)} 100%)`, color: 'white', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.1)' }} />
                <Box sx={{ position: 'absolute', right: 20, bottom: -30, width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700 }}>AVAILABLE POINTS</Typography>
                    <Typography variant="h2" fontWeight={900} sx={{ lineHeight: 1, letterSpacing: -2 }}>
                      {loyalty.points.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>≈ ₹{Math.floor(loyalty.points / 10)} in discounts</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 48 }}>{tierInfo.icon}</Typography>
                </Stack>
                <Chip label={`${tierInfo.label} Member`} sx={{ bgcolor: 'rgba(255,255,255,0.25)', color: 'white', fontWeight: 800 }} />
              </Paper>
            </Grid>

            {/* Stats */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>Your Stats</Typography>
                <Stack spacing={2}>
                  {[
                    { label: 'Total Earned', value: `${loyalty.totalEarned.toLocaleString()} pts`, icon: <TrendingUp sx={{ color: 'success.main' }} /> },
                    { label: 'Total Redeemed', value: `${loyalty.totalRedeemed.toLocaleString()} pts`, icon: <Redeem sx={{ color: 'warning.main' }} /> },
                    { label: 'Points Value', value: `₹${Math.floor(loyalty.points / 10)}`, icon: <LocalOffer sx={{ color: 'primary.main' }} /> },
                  ].map(s => (
                    <Stack key={s.label} direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        {s.icon}
                        <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                      </Stack>
                      <Typography variant="body2" fontWeight={800}>{s.value}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* Tier Progress */}
            <Grid size={{ xs: 12 }}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 3 }}>Tier Progress</Typography>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 3 }}>
                  {['bronze', 'silver', 'gold', 'platinum'].map(t => (
                    <TierBadge key={t} tier={t} active={loyalty.tier === t} />
                  ))}
                </Stack>
                <Box sx={{ mb: 1 }}>
                  <LinearProgress variant="determinate" value={progressPct} sx={{ height: 10, borderRadius: 5, bgcolor: 'grey.100', '& .MuiLinearProgress-bar': { bgcolor: tierInfo.color, borderRadius: 5 } }} />
                </Box>
                {loyalty.nextTier ? (
                  <Typography variant="body2" color="text.secondary">
                    Earn <strong>{loyalty.pointsToNext?.toLocaleString()} more points</strong> to reach {TIERS[loyalty.nextTier]?.label}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">🏆 You've reached the highest tier — Platinum!</Typography>
                )}
              </Paper>
            </Grid>

            {/* Rewards */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>Redeem Rewards</Typography>
              <Grid container spacing={2}>
                {REWARDS.map(reward => {
                  const canAfford = loyalty.points >= reward.points;
                  return (
                    <Grid key={reward.points} size={{ xs: 12, sm: 6, md: 3 }}>
                      <Paper elevation={0} onClick={() => canAfford && handleRedeemOpen(reward)} sx={{ p: 3, borderRadius: 4, border: '2px solid', borderColor: canAfford ? 'primary.main' : 'divider', cursor: canAfford ? 'pointer' : 'default', opacity: canAfford ? 1 : 0.5, transition: 'all 0.2s', '&:hover': canAfford ? { boxShadow: '0 8px 24px rgba(230,57,70,0.15)', transform: 'translateY(-2px)' } : {} }}>
                        <Typography sx={{ fontSize: 32, mb: 1 }}>{reward.icon}</Typography>
                        <Typography variant="h6" fontWeight={800} color={canAfford ? 'primary.main' : 'text.primary'}>{reward.label}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>{reward.desc}</Typography>
                        <Chip label={`${reward.points.toLocaleString()} pts`} size="small" color={canAfford ? 'primary' : 'default'} sx={{ fontWeight: 700 }} />
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Grid>

            {/* How it works */}
            <Grid size={{ xs: 12 }}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: 5, bgcolor: alpha('#7C3AED', 0.04), border: '1px solid', borderColor: alpha('#7C3AED', 0.1) }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, color: '#7C3AED' }}>
                  <WorkspacePremium sx={{ mr: 1, verticalAlign: 'middle' }} />How You Earn Points
                </Typography>
                <Grid container spacing={2}>
                  {[['🛒', 'Place an order', '1 pt per ₹10 spent'], ['⭐', 'Write a review', '+50 pts'], ['👥', 'Refer a friend', '+200 pts'], ['📅', 'Book a reservation', '+100 pts']].map(([emoji, action, pts]) => (
                    <Grid key={action} size={{ xs: 6, md: 3 }}>
                      <Stack spacing={0.5}>
                        <Typography sx={{ fontSize: 24 }}>{emoji}</Typography>
                        <Typography variant="body2" fontWeight={700}>{action}</Typography>
                        <Typography variant="caption" color="text.secondary">{pts}</Typography>
                      </Stack>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        ) : null}
      </Container>

      {/* Redeem Dialog */}
      <Dialog open={redeemDialog} onClose={() => { setRedeemDialog(false); dispatch(clearRedeemSuccess()); }} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 5 } }}>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography fontWeight={800}>Redeem Points</Typography>
            <IconButton size="small" onClick={() => { setRedeemDialog(false); dispatch(clearRedeemSuccess()); }}><Close /></IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {redeemSuccess ? (
            <Box sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h2" sx={{ mb: 1 }}>🎉</Typography>
              <Typography variant="h6" fontWeight={800} color="success.main">Redeemed!</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {redeemSuccess.discount ? `₹${redeemSuccess.discount} discount will be applied to your next order.` : redeemSuccess.message}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Remaining: {redeemSuccess.remainingPoints?.toLocaleString() || loyalty?.points?.toLocaleString()} pts
              </Typography>
            </Box>
          ) : selectedReward && (
            <Stack spacing={2} sx={{ py: 1 }}>
              <Typography sx={{ fontSize: 48, textAlign: 'center' }}>{selectedReward.icon}</Typography>
              <Typography variant="h5" fontWeight={800} textAlign="center">{selectedReward.label}</Typography>
              <Divider />
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Points Cost</Typography>
                <Typography fontWeight={800}>{selectedReward.points.toLocaleString()} pts</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">Your Balance</Typography>
                <Typography fontWeight={800}>{loyalty?.points?.toLocaleString()} pts</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography color="text.secondary">After Redemption</Typography>
                <Typography fontWeight={800} color="primary">{((loyalty?.points || 0) - selectedReward.points).toLocaleString()} pts</Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {redeemSuccess ? (
            <Button fullWidth variant="contained" onClick={() => { setRedeemDialog(false); dispatch(clearRedeemSuccess()); }} sx={{ borderRadius: 3 }}>Done</Button>
          ) : (
            <>
              <Button onClick={() => setRedeemDialog(false)} sx={{ borderRadius: 3 }}>Cancel</Button>
              <Button variant="contained" onClick={handleRedeem} disabled={redeeming} sx={{ borderRadius: 3 }}>
                {redeeming ? <CircularProgress size={20} color="inherit" /> : 'Confirm Redemption'}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
