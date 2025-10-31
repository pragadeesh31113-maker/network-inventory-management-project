// frontend/src/pages/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import { Box, Typography, Grid, Paper, CircularProgress, Alert } from '@mui/material';
import { StatCard } from '../components/StatCard';
import { AssetPieChart } from '../components/charts/AssetPieChart';
// Icons
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import MemoryIcon from '@mui/icons-material/Memory';

// ... (keep the interface definitions for Kpis and ChartData) ...
interface Kpis {
  total_customers: number;
  active_customers: number;
  pending_tasks: number;
  available_onts: number;
}
interface ChartData {
  name: string;
  value: number;
}

export const AdminDashboard: React.FC = () => {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [assetData, setAssetData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/dashboard/summary');
        setKpis(res.data.kpis);
        setAssetData(res.data.asset_summary);
      } catch (err) {
        setError('Failed to load dashboard summary.');
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!kpis) return <Alert severity="info">No data available.</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Total Customers" value={kpis.total_customers} icon={<PeopleIcon />} color="#3F51B5" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Active Customers" value={kpis.active_customers} icon={<CheckCircleIcon />} color="#00C49F" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Pending Tasks" value={kpis.pending_tasks} icon={<PendingActionsIcon />} color="#FF8042" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Available ONTs" value={kpis.available_onts} icon={<MemoryIcon />} color="#FFBB28" />
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 300 + 32 + 20 }}>
            <Typography variant="h6" gutterBottom>Asset Status</Typography>
            <AssetPieChart data={assetData} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: 300 + 32 + 20 }}>
             <Typography variant="h6" gutterBottom>Task Status</Typography>
             {/* We'll build a BarChart component for this in the next sprint */}
             <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%'}}>
               <Typography color="text.secondary">(Task Status Bar Chart)</Typography>
             </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};