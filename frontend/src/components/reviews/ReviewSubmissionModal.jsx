// src/components/reviews/ReviewSubmissionModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Grow,
  IconButton,
  LinearProgress,
  Paper,
  Rating,
  Slider,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  PhotoCamera as PhotoIcon,
  AddPhotoAlternate as AddPhotoIcon,
  Delete as DeleteIcon,
  Stars as PointsIcon,
  CheckCircle as SuccessIcon,
  KeyboardArrowDown as ExpandIcon,
  EmojiEvents as TrophyIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { submitReview } from '@/redux/slices/reviewsSlice';
import { reviewsService } from '@/services/reviewsService';
import Confetti from '../common/Confetti';

const RATING_TEXT = {
  1: "We're sorry to hear that",
  2: "We can do better",
  3: "It was okay",
  4: "We're glad you liked it!",
  5: "Awesome! So happy to hear!"
};

const CATEGORIES = [
  { id: 'food', label: 'Food Quality' },
  { id: 'service', label: 'Service' },
  { id: 'value', label: 'Value for Money' },
  { id: 'presentation', label: 'Presentation' }
];

const ReviewSubmissionModal = ({ open, onClose, order }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [photos, setPhotos] = useState([]);
  const [categoryRatings, setCategoryRatings] = useState({
    food: 5, service: 5, value: 5, presentation: 5
  });
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // Fetch keyword suggestions when rating changes
  useEffect(() => {
    if (open && order?._id) {
      reviewsService.getSuggestions(order._id, rating)
        .then(res => setKeywords(res.data?.keywords || ['crispy', 'flavorful', 'fresh', 'portion size']))
        .catch(() => setKeywords(['crispy', 'flavorful', 'fresh', 'portion size']));
    }
  }, [open, order?._id, rating]);

  // Points Calculation
  const pointsData = useMemo(() => {
    const base = 10;
    const textLen = reviewText.length;
    const textPoints = textLen >= 150 ? 20 : textLen >= 20 ? 10 : 0;
    const keywordCount = keywords.filter(k => reviewText.toLowerCase().includes(k.toLowerCase())).length;
    const keywordPoints = Math.min(keywordCount * 2, 10);
    const photoPoints = photos.length * 5;
    const timelinessPoints = 10; // Simulated
    
    const total = base + textPoints + keywordPoints + photoPoints + timelinessPoints;
    
    return { base, textPoints, keywordPoints, photoPoints, timelinessPoints, total };
  }, [reviewText, keywords, photos]);

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 5) return;
    
    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleKeywordClick = (k) => {
    setReviewText(prev => prev + (prev ? ' ' : '') + k);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Simulate photo upload
      const photoUrls = photos.map((_, i) => `https://example.com/photo${i}.jpg`);
      
      const payload = {
        orderId: order._id,
        restaurantId: order.restaurantId,
        rating,
        text: reviewText,
        photos: photoUrls,
        categoryRatings,
        pointsAwarded: pointsData.total
      };

      await dispatch(submitReview(payload)).unwrap();
      setSubmitted(true);
      setShowConfetti(true);
      setTimeout(() => {
        onClose();
        // Reset state after closing
        setTimeout(() => {
          setSubmitted(false);
          setRating(5);
          setReviewText('');
          setPhotos([]);
          setShowConfetti(false);
        }, 500);
      }, 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth 
      slotProps={{ 
        paper: {
          sx: { borderRadius: 8, overflow: 'hidden', bgcolor: '#FBF9F6' } 
        }
      }}
    >
      <Confetti active={showConfetti} />
      
      {!submitted ? (
        <DialogContent sx={{ p: { xs: 3, md: 6 } }}>
          {/* 1. Header Progress Bar */}
          <Box sx={{ mb: 6 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1 }}>
              <Box>
                <Typography variant="caption" fontWeight={900} color="primary.main" sx={{ letterSpacing: 1 }}>YOUR PROGRESS</Typography>
                <Typography variant="h4" fontWeight={900}>Earning 450 Points</Typography>
              </Box>
              <Typography variant="subtitle2" fontWeight={800} color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                ⊕ Elite Curator Level 2
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={45} 
              sx={{ 
                height: 12, 
                borderRadius: 6, 
                bgcolor: 'rgba(0,0,0,0.05)',
                '& .MuiLinearProgress-bar': { borderRadius: 6, background: 'linear-gradient(90deg, #D85830 0%, #F1754E 100%)' }
              }} 
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic', display: 'block' }}>
              Write 20 more words to unlock the "Taste Maker" badge!
            </Typography>
          </Box>

          {/* 2. Main Question */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h1" sx={{ fontSize: { xs: '2.5rem', md: '5rem' }, fontStyle: 'italic', lineHeight: 1 }}>
              How was your <Box component="span" sx={{ color: 'primary.main' }}>experience?</Box>
            </Typography>
            <Rating
              value={rating}
              onChange={(_, val) => setRating(val)}
              sx={{ 
                mt: 4, 
                fontSize: '4rem', 
                color: 'primary.main',
                '& .MuiRating-iconEmpty': { color: 'grey.300' }
              }}
            />
          </Box>

          {/* 3. Review Panels Grid */}
          <Grid container spacing={4}>
            {/* Detailed Review Section */}
            <Grid size={{ xs: 12, md: 7 }}>

              <Paper sx={{ p: 4, borderRadius: 6, bgcolor: 'rgba(0,0,0,0.02)', border: 'none' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={900}>Detailed Review</Typography>
                  <Chip 
                    label="AI Suggestions On" 
                    size="small" 
                    sx={{ bgcolor: 'rgba(77, 124, 94, 0.1)', color: 'success.main', fontWeight: 800, border: 'none' }} 
                  />
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  placeholder="Tell us about the flavors, the service, and the vibe..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  variant="standard"
                  slotProps={{ input: { sx: { fontSize: '1.2rem' } } }}
                />
                <Box sx={{ mt: 4, display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  {keywords.map((k) => (
                    <Chip
                      key={k}
                      label={k}
                      onClick={() => handleKeywordClick(k)}
                      sx={{ bgcolor: 'white', fontWeight: 700, borderRadius: 3 }}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>

            {/* Photo & Points Section */}
            <Grid size={{ xs: 12, md: 5 }}>

              <Stack spacing={4}>
                {/* Photo Upload Box */}
                <Box 
                  component="label"
                  sx={{ 
                    p: 4, 
                    borderRadius: 6, 
                    border: '2px dashed rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: '0.3s',
                    position: 'relative',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderColor: 'primary.main' }
                  }}
                >
                  <Chip 
                    label="+100 POINTS" 
                    size="small" 
                    color="success" 
                    sx={{ position: 'absolute', top: 12, right: 12, fontWeight: 900 }} 
                  />
                  <Box sx={{ p: 1.5, bgcolor: '#F1754E', borderRadius: '50%', color: 'white', mb: 2 }}>
                    <PhotoIcon fontSize="large" />
                  </Box>
                  <Typography variant="h6" fontWeight={900}>Add Photos/Video</Typography>
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    Show off your experience and earn a curator bonus.
                  </Typography>
                  <input type="file" hidden multiple accept="image/*" onChange={handlePhotoUpload} />
                  
                  {photos.length > 0 && (
                     <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        {photos.map((p, i) => (
                          <Avatar key={i} src={p.preview} sx={{ width: 40, height: 40, borderRadius: 2 }} />
                        ))}
                     </Box>
                  )}
                </Box>

                {/* Bonus Points Summary */}
                <Paper sx={{ p: 4, borderRadius: 6, bgcolor: '#2D2926', color: 'white' }}>
                  <Typography variant="overline" color="primary.main" fontWeight={900}>BONUS POINTS</Typography>
                  <Stack spacing={1} sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Detailed Review</Typography>
                      <Typography variant="body2" fontWeight={800} color="primary.main">+150</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ px: 1, py: 0.3, bgcolor: 'rgba(216, 88, 48, 0.2)', color: 'primary.main', borderRadius: 1, fontWeight: 900 }}>90% Done</Typography>
                      <Typography variant="body2" fontWeight={800} color="primary.main">+{pointsData.total}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ opacity: 0.8 }}>Star Rating</Typography>
                      <Typography variant="body2" fontWeight={800} color="primary.main">+50</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Stack>
            </Grid>
          </Grid>

          {/* 4. Footer Actions */}
          <Box sx={{ mt: 10, pt: 4, borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <Stack direction="row" spacing={4}>
                <Typography variant="body2" fontWeight={800} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}>
                   👁 Preview Review
                </Typography>
                <Typography variant="body2" fontWeight={800} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, opacity: 0.5 }}>
                   ☐ Post Anonymously
                </Typography>
             </Stack>
             
             <Stack direction="row" spacing={2}>
               <Button variant="contained" sx={{ bgcolor: 'grey.200', color: 'text.primary', '&:hover': { bgcolor: 'grey.300' }, minWidth: 140 }}>
                 Save Draft
               </Button>
               <Button variant="contained" onClick={handleSubmit} disabled={loading} sx={{ minWidth: 200, py: 2 }}>
                 {loading ? 'Submitting...' : 'Submit Experience'}
               </Button>
             </Stack>
          </Box>
        </DialogContent>
      ) : (
        /* Success Celebration */
        <Box sx={{ p: 10, textAlign: 'center' }}>
          <TrophyIcon sx={{ fontSize: 100, color: 'primary.main', mb: 4 }} />
          <Typography variant="h2" sx={{ mb: 2, fontStyle: 'italic' }}>Experience <Box component="span" sx={{ color: 'primary.main' }}>Captured!</Box></Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 6 }}>Your curation makes the platform better.</Typography>
          
          <Box sx={{ p: 4, bgcolor: '#2D2926', color: 'white', borderRadius: 6, display: 'inline-block', minWidth: 250 }}>
             <Typography variant="h3" fontWeight={900} color="primary.main">+{pointsData.total}</Typography>
             <Typography variant="overline" fontWeight={900}>CURATOR POINTS EARNED</Typography>
          </Box>

          <Box sx={{ mt: 8 }}>
            <Button variant="contained" onClick={onClose} sx={{ borderRadius: 10, px: 8 }}>
              Explore More
            </Button>
          </Box>
        </Box>
      )}
    </Dialog>
  );
};

export default ReviewSubmissionModal;

