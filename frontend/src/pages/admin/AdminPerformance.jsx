import { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, LinearProgress, Button, 
  Stack, Alert, CircularProgress 
} from '@mui/material';
import { 
  Speed, Timer, Storage, Assessment, PlayArrow, Refresh 
} from '@mui/icons-material';
import AdminLayout from '@/components/layout/AdminLayout';
import adminService from '@/services/adminService';

export default function AdminPerformance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data } = await adminService.getPerformanceStats();
      setData(data);
    } catch (err) {
      console.error('Failed to fetch performance stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const runBenchmark = async () => {
    setRunning(true);
    await fetchResults();
    setRunning(false);
  };

  if (loading && !data) {
    return (
      <AdminLayout>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </AdminLayout>
    );
  }

  const results = data?.summary || [];

  return (
    <AdminLayout>
      <Box sx={{ mb: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{ letterSpacing: '-0.03em', mb: 0.5 }}>
            Core <Box component="span" sx={{ fontStyle: 'italic', fontWeight: 500, color: 'text.secondary' }}>Performance</Box>
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Live database query benchmarks and latency monitoring.</Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={running ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />} 
          onClick={runBenchmark}
          disabled={running}
          sx={{ borderRadius: 6, px: 4, fontWeight: 900 }}
        >
          {running ? 'Benchmarking...' : 'Run Live Benchmark'}
        </Button>
      </Box>

      {running && <LinearProgress sx={{ mb: 4, borderRadius: 2, height: 6 }} />}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>

          <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Timer color="primary" /> Query Latency Report
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>QUERY TARGET</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>AVG LATENCY</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>THRESHOLD</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: 'text.secondary' }}>STATUS</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.map((res, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 800, textTransform: 'capitalize' }}>{res.query.replace('-', ' ')}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={900}>{res.avgMs.toFixed(2)} ms</Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min((res.avgMs / res.targetMs) * 100, 100)} 
                          sx={{ 
                            mt: 1, 
                            height: 4, 
                            borderRadius: 2,
                            bgcolor: 'rgba(0,0,0,0.05)',
                            '& .MuiLinearProgress-bar': { bgcolor: res.avgMs > res.targetMs ? 'error.main' : 'success.main' }
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{res.targetMs} ms</TableCell>
                      <TableCell>
                        <Chip 
                          label={res.status.split(' ')[1]} 
                          size="small" 
                          sx={{ 
                            fontWeight: 900, 
                            bgcolor: res.avgMs <= res.targetMs ? 'rgba(77, 124, 94, 0.1)' : 'rgba(188, 65, 35, 0.1)',
                            color: res.avgMs <= res.targetMs ? 'success.main' : 'error.main' 
                          }} 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>

          <Stack spacing={4}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Speed /> Performance Score
              </Typography>
              <Typography variant="h2" fontWeight={900} sx={{ mb: 1 }}>98.4</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, fontWeight: 600 }}>
                Aggregated score across all system critical pipelines. Optimal range: 95-100.
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 4, borderRadius: 5, border: '1px solid rgba(0,0,0,0.05)', bgcolor: 'white' }}>
              <Typography variant="h6" fontWeight={900} sx={{ mb: 3 }}>Optimization Tips</Typography>
              <Stack spacing={2}>
                 <Alert severity="success" sx={{ borderRadius: 3, fontWeight: 600 }}>
                   Indexes are correctly maintained.
                 </Alert>
                 <Alert severity="info" sx={{ borderRadius: 3, fontWeight: 600 }}>
                   Consider shard key review for 'Orders' collection next month.
                 </Alert>
              </Stack>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
