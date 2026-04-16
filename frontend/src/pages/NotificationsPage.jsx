import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Box, Button, Chip, Container, Divider, IconButton,
  List, ListItem, ListItemAvatar, ListItemText, Paper,
  Skeleton, Stack, Typography, alpha,
} from '@mui/material';
import {
  Campaign, CheckCircle, DoneAll, LocalOffer, Notifications,
  NotificationsNone, Restaurant, Star,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import {
  fetchNotifications, markRead, markAllRead,
  selectNotifications, selectUnreadCount, selectNotificationsLoading,
} from '@/redux/slices/notificationsSlice';
import { selectIsAuthenticated } from '@/redux/slices/authSlice';

const TYPE_CONFIG = {
  order:  { icon: <Restaurant />,   color: '#E63946', bg: '#FFF0F0' },
  promo:  { icon: <LocalOffer />,   color: '#0891B2', bg: '#F0F9FF' },
  review: { icon: <Star />,         color: '#FFB300', bg: '#FFFBEA' },
  event:  { icon: <Campaign />,     color: '#7C3AED', bg: '#F5F3FF' },
  system: { icon: <Notifications />, color: '#6B7280', bg: '#F9FAFB' },
};

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const notifications = useSelector(selectNotifications);
  const unreadCount = useSelector(selectUnreadCount);
  const loading = useSelector(selectNotificationsLoading);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    dispatch(fetchNotifications());
  }, [dispatch, isAuthenticated, navigate]);

  const handleMarkRead = (id) => dispatch(markRead(id));
  const handleMarkAllRead = () => dispatch(markAllRead());

  return (
    <Box sx={{ bgcolor: 'grey.50', minHeight: '100vh', py: 5 }}>
      <Container maxWidth="md">
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
              <Notifications sx={{ color: 'primary.main', fontSize: 28 }} />
              <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: -1 }}>Notifications</Typography>
              {unreadCount > 0 && <Chip label={`${unreadCount} new`} color="error" size="small" sx={{ fontWeight: 800 }} />}
            </Stack>
            <Typography color="text.secondary">Stay updated on your orders, events, and offers.</Typography>
          </Box>
          {unreadCount > 0 && (
            <Button startIcon={<DoneAll />} variant="outlined" size="small" onClick={handleMarkAllRead} sx={{ borderRadius: 3, fontWeight: 700 }}>
              Mark all read
            </Button>
          )}
        </Stack>

        <Paper elevation={0} sx={{ borderRadius: 5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Box key={i}>
                <Stack direction="row" spacing={2} sx={{ p: 2.5 }}>
                  <Skeleton variant="circular" width={44} height={44} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton height={20} width="60%" sx={{ mb: 0.5 }} />
                    <Skeleton height={16} width="80%" />
                  </Box>
                </Stack>
                {i < 4 && <Divider />}
              </Box>
            ))
          ) : notifications.length === 0 ? (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <NotificationsNone sx={{ fontSize: 72, color: 'grey.300', mb: 2 }} />
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>All caught up!</Typography>
              <Typography color="text.secondary">No notifications yet. Place an order to get started.</Typography>
            </Box>
          ) : (
            <List disablePadding>
              {notifications.map((notif, i) => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.system;
                const timeAgo = notif.createdAt
                  ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })
                  : '';

                return (
                  <Box key={notif._id || i}>
                    <ListItem
                      alignItems="flex-start"
                      onClick={() => !notif.isRead && handleMarkRead(notif._id)}
                      sx={{
                        px: 3, py: 2,
                        bgcolor: notif.isRead ? 'transparent' : alpha(cfg.color, 0.04),
                        cursor: notif.isRead ? 'default' : 'pointer',
                        borderLeft: notif.isRead ? 'none' : `3px solid ${cfg.color}`,
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: alpha(cfg.color, 0.06) },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: cfg.bg, color: cfg.color }}>
                          {cfg.icon}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight={notif.isRead ? 600 : 800}>
                              {notif.title}
                            </Typography>
                            {!notif.isRead && <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />}
                          </Stack>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                              {notif.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {timeAgo}
                            </Typography>
                          </Box>
                        }
                      />
                      {!notif.isRead && (
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleMarkRead(notif._id); }} sx={{ mt: 0.5 }}>
                          <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} />
                        </IconButton>
                      )}
                    </ListItem>
                    {i < notifications.length - 1 && <Divider />}
                  </Box>
                );
              })}
            </List>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
