import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Avatar, Chip, Button, 
  TextField, InputAdornment, IconButton, Menu, MenuItem, Stack, CircularProgress 
} from '@mui/material';
import { Search, FilterList, MoreVert, Store, CheckCircle, Block, Visibility } from '@mui/icons-material';
import AdminLayout from '@/components/layout/AdminLayout';
import adminService from '@/services/adminService';

export default function AdminMerchants() {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const { data } = await adminService.getMerchants();
      setMerchants(data.data);
    } catch (err) {
      console.error('Failed to fetch merchants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id, isVerified) => {
    try {
      await adminService.verifyMerchant(id, { isVerified: !isVerified });
      fetchMerchants();
    } catch (err) {
      alert('Failed to update verification status');
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await adminService.verifyMerchant(id, { isActive: !isActive });
      fetchMerchants();
    } catch (err) {
      alert('Failed to update activation status');
    }
  };

  const filteredMerchants = merchants.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.merchantId?.profile?.firstName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.03em', mb: 0.5 }}>
            Merchant <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 500, color: 'text.secondary' }}>Directory</Box>
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Global restaurant partner management and oversight.</Typography>
        </Box>
        <Button variant="contained" color="primary" sx={{ borderRadius: 6, px: 4, fontWeight: 900 }}>Enforce Compliance</Button>
      </Box>

      <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <TextField 
               placeholder="Search merchant name or owner..." 
               size="small"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               InputProps={{ 
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  sx: { borderRadius: 3, width: 350, bgcolor: '#FBF9F6' }
               }} 
            />
            <Stack direction="row" spacing={2}>
               <Button startIcon={<FilterList />} sx={{ fontWeight: 800 }}>Filter</Button>
            </Stack>
         </Box>

         <TableContainer>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
            ) : (
              <Table>
                 <TableHead>
                    <TableRow>
                       <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>MERCHANT</TableCell>
                       <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>CUISINES</TableCell>
                       <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>STATUS</TableCell>
                       <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>RATING</TableCell>
                       <TableCell align="right" sx={{ fontWeight: 900, color: 'text.secondary' }}>ACTION</TableCell>
                    </TableRow>
                 </TableHead>
                 <TableBody>
                    {filteredMerchants.map((m) => (
                      <TableRow key={m.id} hover>
                         <TableCell>
                            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                               <Avatar src={m.coverImage} sx={{ bgcolor: '#FBF9F6', color: '#1D3557', border: '1px solid rgba(0,0,0,0.05)', fontWeight: 900 }}>{m.name[0]}</Avatar>
                               <Box>
                                  <Typography variant="subtitle2" fontWeight={900}>{m.name}</Typography>
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    Owner: {m.merchantId?.profile?.firstName} {m.merchantId?.profile?.lastName}
                                  </Typography>
                               </Box>
                            </Stack>
                         </TableCell>
                         <TableCell sx={{ fontWeight: 800 }}>{m.cuisineTypes?.join(', ')}</TableCell>
                         <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Chip 
                                 label={m.isVerified ? 'Verified' : 'Pending'} 
                                 size="small" 
                                 onClick={() => handleVerify(m.id, m.isVerified)}
                                 sx={{ 
                                   fontWeight: 900, 
                                   cursor: 'pointer',
                                   bgcolor: m.isVerified ? 'rgba(77, 124, 94, 0.1)' : 'rgba(0,0,0,0.05)',
                                   color: m.isVerified ? 'success.main' : 'text.secondary'
                                 }} 
                              />
                              <Chip 
                                 label={m.isActive ? 'Active' : 'Suspended'} 
                                 size="small" 
                                 onClick={() => handleToggleActive(m.id, m.isActive)}
                                 sx={{ 
                                   fontWeight: 900, 
                                   cursor: 'pointer',
                                   bgcolor: m.isActive ? 'rgba(77, 124, 94, 0.1)' : 'rgba(188, 65, 35, 0.1)',
                                   color: m.isActive ? 'success.main' : 'error.main'
                                 }} 
                              />
                            </Stack>
                         </TableCell>
                         <TableCell sx={{ fontWeight: 900 }}>{m.rating?.average} ★ ({m.rating?.count})</TableCell>
                         <TableCell align="right">
                            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                               <IconButton size="small"><Visibility sx={{ fontSize: 18 }} /></IconButton>
                               <IconButton 
                                onClick={() => handleToggleActive(m.id, m.isActive)}
                                size="small"
                              >
                                {m.isActive ? <Block sx={{ fontSize: 18, color: 'error.main' }} /> : <CheckCircle sx={{ fontSize: 18, color: 'success.main' }} />}
                               </IconButton>
                            </Stack>
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

