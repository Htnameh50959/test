import { Box, Typography, Paper, Grid, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Avatar, Chip, Button, TextField, InputAdornment, IconButton, Stack } from '@mui/material';
import { Search, FilterList, MoreVert, Person, Mail, Phone, History, Shield } from '@mui/icons-material';
import AdminLayout from '@/components/layout/AdminLayout';

const USERS = [
  { id: 'U1', name: 'James Clear', email: 'james@atomic.com', phone: '+1 234 567 8901', status: 'Active', orders: 42, spent: '₹1,250' },
  { id: 'U2', name: 'Marie Kondo', email: 'marie@joy.com', phone: '+1 234 567 8902', status: 'Active', orders: 12, spent: '₹420' },
  { id: 'U3', name: 'Naval Ravikant', email: 'naval@wisdom.com', phone: '+1 234 567 8903', status: 'Flagged', orders: 8, spent: '₹2,100' },
  { id: 'U4', name: 'Tim Ferriss', email: 'tim@work.com', phone: '+1 234 567 8904', status: 'Active', orders: 154, spent: '₹8,400' },
];

export default function AdminUsers() {
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
               InputProps={{ 
                  startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
                  sx: { borderRadius: 3, width: 350, bgcolor: '#FBF9F6' }
               }} 
            />
            <Stack direction="row" spacing={1}>
               <Button startIcon={<FilterList />} sx={{ fontWeight: 800 }}>Search Parameters</Button>
            </Stack>
         </Box>

         <TableContainer>
            <Table>
               <TableHead>
                  <TableRow>
                     <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>USER</TableCell>
                     <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>CONTACT</TableCell>
                     <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>STATUS</TableCell>
                     <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>ACTIVITY</TableCell>
                     <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>TOTAL SPENT</TableCell>
                     <TableCell align="right" sx={{ fontWeight: 900, color: 'text.secondary' }}>ACTION</TableCell>
                  </TableRow>
               </TableHead>
               <TableBody>
                  {USERS.map((u) => (
                    <TableRow key={u.id} hover>
                       <TableCell>
                          <Stack direction="row" spacing={2} alignItems="center">
                             <Avatar sx={{ bgcolor: 'primary.main', fontWeight: 900 }}>{u.name[0]}</Avatar>
                             <Box>
                                <Typography variant="subtitle2" fontWeight={900}>{u.name}</Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight={700}>#{u.id}</Typography>
                             </Box>
                          </Stack>
                       </TableCell>
                       <TableCell>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}><Mail sx={{ fontSize: 14 }} /> {u.email}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 700 }}><Phone sx={{ fontSize: 14 }} /> {u.phone}</Typography>
                       </TableCell>
                       <TableCell>
                          <Chip 
                             label={u.status} 
                             size="small" 
                             sx={{ 
                               fontWeight: 900, 
                               bgcolor: u.status === 'Active' ? 'rgba(77, 124, 94, 0.1)' : 'rgba(188, 65, 35, 0.1)',
                               color: u.status === 'Active' ? 'success.main' : 'error.main'
                             }} 
                          />
                       </TableCell>
                       <TableCell sx={{ fontWeight: 900 }}>{u.orders} Orders</TableCell>
                       <TableCell sx={{ fontWeight: 900, color: 'primary.main' }}>{u.spent}</TableCell>
                       <TableCell align="right">
                          <IconButton size="small"><History sx={{ fontSize: 18 }} /></IconButton>
                          <IconButton size="small"><MoreVert sx={{ fontSize: 18 }} /></IconButton>
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

const AdminUsersLayout = ({ children }) => (
  <AdminLayout>{children}</AdminLayout>
);
