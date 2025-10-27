// frontend/src/pages/InventoryPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Grid, List, ListItem, ListItemText, SelectChangeEvent, Stack
} from '@mui/material';
import { AssetPieChart } from '../components/charts/AssetPieChart';
import { StatCard } from '../components/StatCard';
// Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import DevicesIcon from '@mui/icons-material/Devices';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';

// --- Types ---
type AssetStatus = "AVAILABLE" | "ASSIGNED" | "FAULTY" | "IN_REPAIR" | "RETIRED";
type AssetType = "ONT" | "ROUTER";
interface Asset { id: number; serial_number: string; model: string | null; asset_type: AssetType; status: AssetStatus; location: string | null; assigned_to_customer_id: number | null; }
interface AssetHistory { id: number; timestamp: string; action: string; details: string | null; changed_by_user_id: number | null; }
interface SummaryData { kpis: { total_assets: number; total_assigned: number; total_available: number; total_faulty: number; }; by_status: { name: string, value: number }[]; by_type: { name: string, value: number }[]; }

const emptyAsset = {
  serial_number: '', model: '', asset_type: 'ONT' as AssetType,
  status: 'AVAILABLE' as AssetStatus, location: 'Central Warehouse',
};

const LEGEND_COLORS: { [key: string]: string } = {
  AVAILABLE: '#00C49F', // Green
  ASSIGNED: '#0088FE', // Blue
  FAULTY: '#FF8042',   // Yellow/Orange (Changed from FF8042 to avoid clash)
  IN_REPAIR: '#FFBB28', // Darker Orange
  RETIRED: '#B0B0B0',   // Gray
  ONT: '#8884D8',       // Light Green
  ROUTER: '#82CA9D',     // Purple
  FDH: '#FF8042'       // Darker Orange (Same as IN_REPAIR) - Add FDH here
  // Note: FDH and IN_REPAIR now share a color. You might want to pick a different one for FDH.
};

// --- Main Component ---
export const InventoryPage: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dialog State
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>(emptyAsset);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAssetSN, setHistoryAssetSN] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<AssetHistory[]>([]);

  // Filtering State
  const [statusFilter, setStatusFilter] = useState<AssetStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<AssetType | null>(null);
  const [modelFilter, setModelFilter] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(''); // Clear previous errors on refetch
    try {
      const [assetsRes, summaryRes] = await Promise.all([
        api.get('/assets/'),
        api.get('/assets/summary')
      ]);
      setAssets(assetsRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      setError('Failed to fetch assets and summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const uniqueModels = useMemo(() => {
    const models = new Set(assets.map(a => a.model).filter(Boolean));
    return Array.from(models) as string[];
  }, [assets]);

  // Handlers (Create, Edit, Save, Delete, History)
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setCurrentAsset(emptyAsset);
    setError(''); // Clear errors when opening dialog
    setOpen(true);
  };
  const handleOpenEdit = (asset: Asset) => {
    setIsEditMode(true);
    setCurrentAsset(asset);
    setError(''); // Clear errors when opening dialog
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setError(''); // Clear errors when closing dialog
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
     const { name, value } = e.target;
     setCurrentAsset(prev => ({ ...prev, [name as string]: value }));
  };
  const handleSave = async () => {
    setError('');
    try {
      if (isEditMode) {
        const { id, serial_number, ...updateData } = currentAsset;
        await api.put(`/assets/${id}`, updateData);
      } else {
        await api.post('/assets/', currentAsset);
      }
      fetchData();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save asset.');
      // Keep dialog open on error
    }
  };
  const handleDelete = async (assetId: number) => {
    setError('');
    if (window.confirm('Are you sure you want to delete this asset? This cannot be undone.')) {
      try {
        await api.delete(`/assets/${assetId}`);
        fetchData();
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to delete asset.');
      }
    }
  };
  const getStatusChip = (status: AssetStatus) => {
    const colorMap: Record<AssetStatus, "success" | "info" | "error" | "warning" | "default"> = {
      AVAILABLE: 'success', ASSIGNED: 'info', FAULTY: 'error',
      IN_REPAIR: 'warning', RETIRED: 'default',
    };
    return <Chip label={status} color={colorMap[status]} variant="outlined" size="small" />;
  };
  const handleOpenHistory = async (asset: Asset) => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryAssetSN(asset.serial_number);
    setError(''); // Clear errors
    try {
      const res = await api.get(`/assets/${asset.id}/history`);
      setHistoryData(res.data);
    } catch (err) {
      setError('Failed to fetch asset history.');
      setHistoryData([]); // Clear old data on error
    } finally {
      setHistoryLoading(false);
    }
  };

  // --- **Filter Handlers (Updated for Compound Filtering)** ---
  const handleStatusSliceClick = (statusName: string) => {
    // Toggle the status filter. If clicking the same slice again, clear it.
    setStatusFilter(prev => (prev === statusName ? null : statusName as AssetStatus));
    // **NO LONGER CLEARS OTHER FILTERS**
  };

  const handleTypeSliceClick = (typeName: string) => {
    // Toggle the type filter.
    setTypeFilter(prev => (prev === typeName ? null : typeName as AssetType));
    // **NO LONGER CLEARS OTHER FILTERS**
  };

  const handleModelChange = (e: SelectChangeEvent) => {
    // Set or clear the model filter.
    const model = e.target.value as string;
    setModelFilter(model ? model : null);
    // **NO LONGER CLEARS OTHER FILTERS**
  };

  const clearAllFilters = () => {
    // Clears ALL filters
    setStatusFilter(null);
    setTypeFilter(null);
    setModelFilter(null);
  }
  // -----------------------------------------------------------------

  // --- **Memoized filtered assets (Updated for Compound Filtering)** ---
  const filteredAssets = useMemo(() => {
    // Start with all assets and apply each filter sequentially
    return assets.filter(asset => {
      // Check status filter (if active)
      if (statusFilter && asset.status !== statusFilter) {
        return false;
      }
      // Check type filter (if active)
      if (typeFilter && asset.asset_type !== typeFilter) {
        return false;
      }
      // Check model filter (if active)
      if (modelFilter && asset.model !== modelFilter) {
        return false;
      }
      // If none of the filters excluded the asset, keep it
      return true;
    });
  }, [assets, statusFilter, typeFilter, modelFilter]); // Dependencies include all filters
  // -----------------------------------------------------------------


  if (loading) return <CircularProgress />;
  if (!summary) return <Alert severity="error">Failed to load dashboard data.</Alert>;

  return (
    <Box>
      {/* --- Header --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Asset Management</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Model Filter Dropdown */}
          <FormControl sx={{ minWidth: 240 }} size="small">
            <InputLabel>Filter by Model</InputLabel>
            <Select value={modelFilter || ''} label="Filter by Model" onChange={handleModelChange}>
              <MenuItem value=""><em>Show All Models</em></MenuItem>
              {uniqueModels.map(model => (<MenuItem key={model} value={model}>{model}</MenuItem>))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}> Add New Asset </Button>
        </Box>
      </Box>

      {/* --- Row 1: KPI Cards --- */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
         <Grid item xs={12} sm={6} md={3}> <StatCard title="Total Assets" value={summary.kpis.total_assets} icon={<DevicesIcon />} color="#3F51B5" /> </Grid>
         <Grid item xs={12} sm={6} md={3}> <StatCard title="Available" value={summary.kpis.total_available} icon={<CheckCircleIcon />} color="#00C49F" /> </Grid>
         <Grid item xs={12} sm={6} md={3}> <StatCard title="Assigned" value={summary.kpis.total_assigned} icon={<AssignmentTurnedInIcon />} color="#FFBB28" /> </Grid>
         <Grid item xs={12} sm={6} md={3}> <StatCard title="Faulty" value={summary.kpis.total_faulty} icon={<ErrorIcon />} color="#FF8042" /> </Grid>
      </Grid>

      {/* --- Row 2: Charts --- */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 380, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Assets by Status</Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AssetPieChart data={summary.by_status} onSliceClick={handleStatusSliceClick} activeFilter={statusFilter}/>
              <CustomLegend data={summary.by_status} colors={LEGEND_COLORS} activeFilter={statusFilter} onClick={handleStatusSliceClick} />
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: 380, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>Assets by Type</Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AssetPieChart data={summary.by_type} onSliceClick={handleTypeSliceClick} activeFilter={typeFilter}/>
              <CustomLegend data={summary.by_type} colors={LEGEND_COLORS} activeFilter={typeFilter} onClick={handleTypeSliceClick} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* --- **Active Filters Display (Updated)** --- */}
      {(statusFilter || typeFilter || modelFilter) && (
        <Alert
          severity="info"
          action={
            <Button color="inherit" size="small" onClick={clearAllFilters} startIcon={<HighlightOffIcon />}>
              Clear All Filters
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Active Filters:
          {statusFilter && ` Status: ${statusFilter}`}
          {typeFilter && ` Type: ${typeFilter}`}
          {modelFilter && ` Model: ${modelFilter}`}
        </Alert>
      )}
      {/* ------------------------------------------- */}

      {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

      {/* --- Row 3: Data Table --- */}
      <Paper>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                 <TableCell>Serial Number</TableCell>
                 <TableCell>Type</TableCell>
                 <TableCell>Model</TableCell>
                 <TableCell>Status</TableCell>
                 <TableCell>Location</TableCell>
                 <TableCell>Assigned To (Customer ID)</TableCell>
                 <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Uses filteredAssets.map(...) */}
              {filteredAssets.map((asset) => (
                <TableRow hover key={asset.id}>
                   <TableCell sx={{ fontWeight: 600 }}>{asset.serial_number}</TableCell>
                   <TableCell>{asset.asset_type}</TableCell>
                   <TableCell>{asset.model || 'N/A'}</TableCell>
                   <TableCell>{getStatusChip(asset.status)}</TableCell>
                   <TableCell>{asset.location || 'N/A'}</TableCell>
                   <TableCell>{asset.assigned_to_customer_id || '---'}</TableCell>
                   <TableCell align="right">
                     <IconButton size="small" onClick={() => handleOpenHistory(asset)} title="View History"> <HistoryIcon /> </IconButton>
                     <IconButton size="small" onClick={() => handleOpenEdit(asset)} title="Edit"> <EditIcon /> </IconButton>
                     <IconButton size="small" onClick={() => handleDelete(asset.id)} title="Delete"> <DeleteIcon /> </IconButton>
                   </TableCell>
                </TableRow>
              ))}
              {/* Add a message if no assets match the filters */}
              {filteredAssets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No assets match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* --- Dialogs --- */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditMode ? 'Edit Asset' : 'Create New Asset'}</DialogTitle>
        <DialogContent>
          {/* ... Create/Edit Dialog Content ... */}
           <TextField autoFocus margin="dense" label="Serial Number" fullWidth name="serial_number" value={currentAsset.serial_number || ''} onChange={handleChange} disabled={isEditMode} />
           <TextField margin="dense" label="Model" fullWidth name="model" value={currentAsset.model || ''} onChange={handleChange} />
           <FormControl margin="dense" fullWidth>
             <InputLabel>Asset Type</InputLabel>
             <Select label="Asset Type" name="asset_type" value={currentAsset.asset_type || 'ONT'} onChange={handleChange} disabled={isEditMode}>
               <MenuItem value="ONT">ONT</MenuItem> <MenuItem value="ROUTER">Router</MenuItem>
             </Select>
           </FormControl>
           <FormControl margin="dense" fullWidth>
             <InputLabel>Status</InputLabel>
             <Select label="Status" name="status" value={currentAsset.status || 'AVAILABLE'} onChange={handleChange}>
               <MenuItem value="AVAILABLE">Available</MenuItem> <MenuItem value="ASSIGNED">Assigned</MenuItem> <MenuItem value="FAULTY">Faulty</MenuItem>
               <MenuItem value="IN_REPAIR">In Repair</MenuItem> <MenuItem value="RETIRED">Retired</MenuItem>
             </Select>
           </FormControl>
           <TextField margin="dense" label="Location" fullWidth name="location" value={currentAsset.location || ''} onChange={handleChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="outlined">Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
         <DialogTitle>Asset History: {historyAssetSN}</DialogTitle>
         <DialogContent>
           {historyLoading ? (<CircularProgress />) : (
             <List dense>
               {historyData.map((log) => (
                 <ListItem divider key={log.id}>
                   <ListItemText primary={log.action} secondary={
                       <>
                         <Typography component="span" variant="body2" color="text.primary"> {new Date(log.timestamp).toLocaleString()} </Typography>
                         {` — ${log.details || 'No details'}`}
                         {log.changed_by_user_id && ` (User ID: ${log.changed_by_user_id})`}
                       </>
                     }
                   />
                 </ListItem>
               ))}
             </List>
           )}
         </DialogContent>
         <DialogActions> <Button onClick={() => setHistoryOpen(false)}>Close</Button> </DialogActions>
      </Dialog>
    </Box>
  );
};


// --- Custom Legend Component ---
interface CustomLegendProps {
  data: { name: string, value: number }[];
  colors: { [key: string]: string };
  activeFilter: string | null;
  onClick: (name: string) => void;
}

const CustomLegend: React.FC<CustomLegendProps> = ({ data, colors, activeFilter, onClick }) => (
  <Stack direction="column" spacing={0.5} sx={{ ml: 4, my: 'auto' }}>
    {data.map((entry) => (
      <Box key={`legend-${entry.name}`} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', opacity: activeFilter && activeFilter !== entry.name ? 0.6 : 1, fontWeight: activeFilter === entry.name ? 'bold' : 'normal', '&:hover': { opacity: 0.8 }, transition: 'opacity 0.2s', }} onClick={() => onClick(entry.name)}>
        <Box sx={{ width: 16, height: 16, borderRadius: '4px', bgcolor: colors[entry.name] || '#A0A0A0', mr: 1 }} />
        <Typography variant="body2">{entry.name} ({entry.value})</Typography>
      </Box>
    ))}
  </Stack>
);