import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Avatar, Chip, Button, 
  TextField, InputAdornment, IconButton, Stack, CircularProgress 
} from '@mui/material';
import { Search, FilterList, MoreVert, Person, Mail, Phone, History, Shield } from '@mui/icons-material';
import AdminLayout from '@/components/layout/AdminLayout';
import adminService from '@/services/adminService';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await adminService.getUsers();
      setUsers(data.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
     try {
        await adminService.updateUserStatus(id, !currentStatus);
        fetchUsers();
     } catch (err) {
        alert('Failed to update user status');
     }
  };

  const filteredUsers = users.filter(u => 
    u.profile?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.03em', mb: 0.5 }}>
            User <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 500, color: 'text.secondary' }}>Database</Box>
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>System-wide customer profiles and behavior monitoring.</Typography>
        </Box>
        <Stack direction="row" spacing={2}>
           <Button variant="outlined" startIcon={<Shield />} sx={{ borderRadius: 3, fontWeight: 800 }}>Audit Logs</Button>
           <Button variant="contained" color="primary" sx={{ borderRadius: 10, px: 4, fontWeight: 900 }}>Export CRM Data</Button>
        </Stack>
      </Box>

      <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <TextField 
               placeholder="Search by name, email or phone..." 
               size="small"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               slotProps={{ 
                  input: { 
                    startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                    sx: { borderRadius: 3, bgcolor: '#FBF9F6' }
                  }
               }}
               sx={{ width: 350 }}
            />
            <Stack direction="row" spacing={1}>
               <Button startIcon={<FilterList />} sx={{ fontWeight: 800 }}>Search Parameters</Button>
            </Stack>
         </Box>

         <TableContainer>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
            ) : (
              <Table>
                 <TableHead>
                    <TableRow>
                       <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>USER</TableCell>
                       <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>CONTACT</TableCell>
                       <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>STATUS</TableCell>
                       <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>ROLE</TableCell>
                       <TableCell align="right" sx={{ fontWeight: 900, color: 'text.secondary' }}>ACTION</TableCell>
                    </TableRow>
                 </TableHead>
                 <TableBody>
                    {filteredUsers.map((u) => (
                      <TableRow key={u.id} hover>
                         <TableCell>
                            <Stack direction="row" spacing={2} alignItems="center">
                               <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 900 }}>{u.profile?.firstName?.[0]}</Avatar>
                               <Box>
                                  <Typography variant="subtitle2" fontWeight={900}>{u.profile?.firstName} {u.profile?.lastName}</Typography>
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>#{u.id?.slice(-6)}</Typography>
                               </Box>
                            </Stack>
                         </TableCell>
                         <TableCell>
                            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}><Mail sx={{ fontSize: 14 }} /> {u.email}</Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}><Phone sx={{ fontSize: 14 }} /> {u.profile?.phone || 'N/A'}</Typography>
                         </TableCell>
                         <TableCell>
                            <Chip 
                               label={u.isActive ? 'Active' : 'Deactivated'} 
                               size="small" 
                               onClick={() => handleStatusToggle(u.id, u.isActive)}
                               sx={{ 
                                 fontWeight: 900, 
                                 cursor: 'pointer',
                                 bgcolor: u.isActive ? 'rgba(77, 124, 94, 0.1)' : 'rgba(188, 65, 35, 0.1)',
                                 color: u.isActive ? 'success.main' : 'error.main'
                               }} 
                            />
                         </TableCell>
                         <TableCell sx={{ fontWeight: 900, textTransform: 'capitalize' }}>{u.role}</TableCell>
                         <TableCell align="right">
                            <IconButton size="small"><History sx={{ fontSize: 18 }} /></IconButton>
                            <IconButton size="small"><MoreVert sx={{ fontSize: 18 }} /></IconButton>
                         </TableCell>
                      </TableRow>
                    ))}
                 </TableBody>
              </Table>
            )}
         </TableContainer>
      </Paper>
    </AdminLayout>
  );
}

