import { Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, Chip, Button, TextField, InputAdornment, IconButton, Menu, MenuItem, Stack } from '@mui/material';
import { Search, FilterList, MoreVert, Store, CheckCircle, Block, Visibility } from '@mui/icons-material';
import AdminLayout from '@/components/layout/AdminLayout';

const MERCHANTS = [
  { id: 'M1', name: 'Grand Hyatt Buffet', owner: 'Victor Wang', category: 'Fine Dining', status: 'Verified', rev: '₹124,000', orders: 1240 },
  { id: 'M2', name: 'Elite Bistro', owner: 'Sarah Jenkins', category: 'Cafe', status: 'Pending', rev: '₹0', orders: 0 },
  { id: 'M3', name: 'Shadow Lounge', owner: 'Michael Scott', category: 'Bar & Grill', status: 'Verified', rev: '₹86,000', orders: 840 },
  { id: 'M4', name: 'Rustic Flame', owner: 'Julia Roberts', category: 'Steakhouse', status: 'Suspended', rev: '₹42,000', orders: 320 },
];

export default function AdminMerchants() {
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
            <Table>
               <TableHead>
                  <TableRow>
                     <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>MERCHANT</TableCell>
                     <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>CATEGORY</TableCell>
                     <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>STATUS</TableCell>
                     <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>REVENUE</TableCell>
                     <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>ORDERS</TableCell>
                     <TableCell align="right" sx={{ fontWeight: 900, color: 'text.secondary' }}>ACTION</TableCell>
                  </TableRow>
               </TableHead>
               <TableBody>
                  {MERCHANTS.map((m) => (
                    <TableRow key={m.id} hover>
                       <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                             <Avatar sx={{ bgcolor: '#FBF9F6', color: '#1D3557', border: '1px solid rgba(0,0,0,0.05)', fontWeight: 900 }}>{m.name[0]}</Avatar>
                             <Box>
                                <Typography variant="subtitle2" fontWeight={900}>{m.name}</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>{m.owner}</Typography>
                             </Box>
                          </Stack>
                       </TableCell>
                       <TableCell sx={{ fontWeight: 800 }}>{m.category}</TableCell>
                       <TableCell>
                          <Chip 
                             label={m.status} 
                             size="small" 
                             sx={{ 
                               fontWeight: 900, 
                               bgcolor: m.status === 'Verified' ? 'rgba(77, 124, 94, 0.1)' : m.status === 'Suspended' ? 'rgba(188, 65, 35, 0.1)' : 'rgba(0,0,0,0.05)',
                               color: m.status === 'Verified' ? 'success.main' : m.status === 'Suspended' ? 'error.main' : 'text.secondary'
                             }} 
                          />
                       </TableCell>
                       <TableCell sx={{ fontWeight: 900 }}>{m.rev}</TableCell>
                       <TableCell sx={{ fontWeight: 900 }}>{m.orders}</TableCell>
                       <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                             <IconButton size="small"><Visibility sx={{ fontSize: 18 }} /></IconButton>
                             <IconButton size="small"><Block sx={{ fontSize: 18, color: 'error.main' }} /></IconButton>
                          </Stack>
                       </TableCell>
                    </TableRow>
                  ))}
               </TableBody>
            </Table>
         </TableContainer>
      </Paper>
    </AdminLayout>
  );
}
