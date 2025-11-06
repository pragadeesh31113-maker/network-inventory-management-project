// frontend/src/pages/InventoryPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Grid, List, ListItem, ListItemText, SelectChangeEvent, Stack, AlertTitle, Tooltip,
  InputAdornment
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
import SearchIcon from '@mui/icons-material/Search';

// --- Types ---
type AssetStatus = "AVAILABLE" | "ASSIGNED" | "FAULTY" | "IN_REPAIR" | "RETIRED" | "IN_USE";
type AssetType = "ONT" | "ROUTER" | "SPLITTER" | "FDH";

// --- Types from API (AssetDetail) ---
interface UserInfo {
  username: string;
  email: string;
  full_name: string;
}
interface AssignedCustomer {
  id: number;
  user: UserInfo;
}
interface Asset {
  id: number;
  serial_number: string;
  model: string | null;
  asset_type: AssetType;
  status: AssetStatus;
  location: string | null;
  assigned_to_customer: AssignedCustomer | null;
}
// --- END Types ---

interface AssetHistory {
  id: number;
  timestamp: string;
  action: string;
  details: string | null;
  changed_by_user_id: number | null;
}

interface CalculatedSummary {
  kpis: {
    total_assets: number;
    total_assigned: number;
    total_available: number;
    total_faulty: number;
  };
  by_status: { name: string, value: number }[];
  by_type: { name: string, value: number }[];
}


const emptyAsset: Partial<Asset> = {
  serial_number: '',
  model: '',
  asset_type: 'ONT',
  status: 'AVAILABLE',
  location: 'Central Warehouse',
};

// Colors for the Legend
const LEGEND_COLORS: { [key: string]: string } = {
  AVAILABLE: '#00C49F', 
  ASSIGNED: '#0088FE', 
  FAULTY: '#FFBB28',
  IN_REPAIR: '#FF8042', 
  RETIRED: '#B0B0B0',
  IN_USE: '#8884D8', // Purple for "IN_USE"
  ONT: '#8884D8', 
  ROUTER: '#82CA9D', 
  SPLITTER: '#FF7F0E', 
  FDH: '#1F77B4',
};

// --- Custom Legend Component ---
interface LegendProps {
  data: { name: string, value: number }[];
  colors: { [key: string]: string };
  activeFilter: string | null;
  onClick: (name: string) => void;
}
const CustomLegend: React.FC<LegendProps> = ({ data, colors, activeFilter, onClick }) => (
  <List dense sx={{ width: '100%', maxWidth: 200, ml: 3 }}>
    {data.map((entry) => (
      <ListItem
        key={entry.name}
        button
        onClick={() => onClick(entry.name)}
        sx={{
          opacity: activeFilter ? (activeFilter === entry.name ? 1 : 0.5) : 1,
          border: activeFilter === entry.name ? `2px solid ${colors[entry.name]}` : 'none',
          borderRadius: '4px',
          mb: 0.5,
        }}
      >
        <Box sx={{ width: 16, height: 16, bgcolor: colors[entry.name] || '#ccc', mr: 1.5, borderRadius: '3px' }} />
        <ListItemText primary={`${entry.name} (${entry.value})`} primaryTypographyProps={{ variant: 'body2', noWrap: true }} />
      </ListItem>
    ))}
  </List>
);

// --- Helper function to calculate summary from the asset list ---
const calculateSummary = (assets: Asset[]): CalculatedSummary => {
  const summary: CalculatedSummary = {
    kpis: {
      total_assets: assets.length,
      total_assigned: 0,
      total_available: 0,
      total_faulty: 0,
    },
    by_status: [],
    by_type: [],
  };

  const statusCount: { [key: string]: number } = {};
  const typeCount: { [key in AssetType]?: number } = {};

  for (const asset of assets) {
    // Count for KPIs
    if (asset.status === 'ASSIGNED') summary.kpis.total_assigned++;
    if (asset.status === 'AVAILABLE') summary.kpis.total_available++;
    if (asset.status === 'FAULTY' || asset.status === 'IN_REPAIR') summary.kpis.total_faulty++;

    // Count for charts
    statusCount[asset.status] = (statusCount[asset.status] || 0) + 1;
    typeCount[asset.asset_type] = (typeCount[asset.asset_type] || 0) + 1;
  }

  summary.by_status = Object.entries(statusCount).map(([name, value]) => ({ name, value }));
  summary.by_type = Object.entries(typeCount).map(([name, value]) => ({ name, value }));

  return summary;
};


// --- Main Component ---
export const InventoryPage: React.FC = () => {
  // --- State Variables ---
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<CalculatedSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog States
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentAsset, setCurrentAsset] = useState<Partial<Asset>>(emptyAsset);
  
  // History Dialog States
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyAssetSN, setHistoryAssetSN] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<AssetHistory[]>([]);
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState<AssetStatus | null>(null);
  const [typeFilter, setTypeFilter] = useState<AssetType | null>(null);
  const [modelFilter, setModelFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setError('');
    setLoading(true); 
    try {
      const assetsResponse = await api.get<Asset[]>('/api/assets/');
      const allAssets = assetsResponse.data;
      const calculatedSummary = calculateSummary(allAssets);
      
      setAssets(allAssets);
      setSummary(calculatedSummary);

    } catch (err: any) {
      console.error("Failed to fetch inventory data:", err);
      const message = err.response?.data?.detail || 'Failed to load inventory. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate unique models for the filter dropdown
  const uniqueModels = useMemo(() => {
    const models = new Set(assets
      .map(asset => asset.model)
      .filter((model): model is string => !!model)
    );
    return Array.from(models).sort();
  }, [assets]);

  // --- Handlers ---
  const handleOpenCreate = () => {
    setCurrentAsset(emptyAsset);
    setIsEditMode(false);
    setError('');
    setOpen(true);
  };

  const handleOpenEdit = async (asset: Asset) => {
    setError('');
    setCurrentAsset(asset);
    setIsEditMode(true);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setCurrentAsset(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    setError('');
    try {
      if (isEditMode) {
        const updatePayload = {
          model: currentAsset.model,
          status: currentAsset.status,
          location: currentAsset.location
        };
        await api.put(`/api/assets/${currentAsset.id}`, updatePayload);
      } else {
        await api.post('/api/assets/', currentAsset);
      }
      handleClose(); 
      fetchData();
    } catch (err: any) {
      console.error("Failed to save asset:", err);
      setError(err.response?.data?.detail || 'Failed to save asset.');
    }
  };
  
  const handleDelete = async (assetId: number, assetType: AssetType) => {
    if (window.confirm(`Are you sure you want to delete this ${assetType}? This action cannot be undone.`)) {
      try {
        await api.delete(`/api/assets/${assetId}`);
        fetchData();
      } catch (err: any)
      {
        console.error("Failed to delete asset:", err);
        setError(err.response?.data?.detail || 'Failed to delete asset.');
      }
    }
  };

  const handleOpenHistory = async (asset: Asset) => {
    setHistoryAssetSN(asset.serial_number);
    setHistoryLoading(true);
    setHistoryOpen(true);
    setError(''); 
    try {
      const response = await api.get<AssetHistory[]>(`/api/assets/${asset.id}/history`);
      setHistoryData(response.data);
    } catch (err: any) {
      console.error("Failed to fetch history:", err);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusChip = (status: AssetStatus): React.ReactElement | null => {
    const colorMap: Record<AssetStatus, "success" | "info" | "error" | "warning" | "default" | "secondary"> = {
      AVAILABLE: 'success', 
      ASSIGNED: 'info', 
      FAULTY: 'error',
      IN_REPAIR: 'warning', 
      RETIRED: 'default',
      IN_USE: 'secondary'
    };
    if (status && colorMap[status]) {
      return <Chip label={status} color={colorMap[status]} variant="outlined" size="small" />;
    }
    return null;
  };

  // --- Filter Handlers ---
  const handleStatusSliceClick = (statusName: string) => {
    setStatusFilter(prev => (prev === statusName ? null : statusName as AssetStatus));
  };
  
  const handleTypeSliceClick = (typeName: string) => {
    setTypeFilter(prev => (prev === typeName ? null : typeName as AssetType));
  };
  
  const handleModelChange = (e: SelectChangeEvent) => {
    setModelFilter(e.target.value ? e.target.value : null);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value.toLowerCase());
  };
  
  const clearAllFilters = () => {
    setStatusFilter(null);
    setTypeFilter(null);
    setModelFilter(null);
    setSearchQuery('');
  }

  // --- Memoized Filtered Data (NOW WITH SEARCH) ---
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      // 1. Pie Chart/Dropdown Filters
      if (statusFilter && asset.status !== statusFilter) return false;
      if (typeFilter && asset.asset_type !== typeFilter) return false;
      if (modelFilter && asset.model !== modelFilter) return false;
      
      // 2. Text Search Filter
      if (searchQuery) {
        const customerName = asset.assigned_to_customer?.user?.full_name?.toLowerCase() || '';
        const location = asset.location?.toLowerCase() || '';
        const serial = asset.serial_number.toLowerCase();
        const model = asset.model?.toLowerCase() || '';
        
        if (
          !serial.includes(searchQuery) &&
          !model.includes(searchQuery) &&
          !location.includes(searchQuery) &&
          !customerName.includes(searchQuery)
        ) {
          return false;
        }
      }
      
      return true;
    });
  }, [assets, statusFilter, typeFilter, modelFilter, searchQuery]);

  // --- Render Logic ---
  if (loading && assets.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary && !loading) {
    return (
      <Alert severity="error">
        <AlertTitle>Error</AlertTitle>
        {error || 'Failed to load dashboard summary data.'}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">Asset Management</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="Search Inventory"
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>Filter by Model</InputLabel>
            <Select
              value={modelFilter || ''}
              label="Filter by Model"
              onChange={handleModelChange}
            >
              <MenuItem value=""><em>All Models</em></MenuItem>
              {uniqueModels.map(model => (
                <MenuItem key={model} value={model}>{model}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
            Add New Asset
          </Button>
        </Box>
      </Box>

{/* KPI Cards */}
{summary && (
  <Grid container spacing={3} sx={{ mb: 3 }}>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard title="Total Assets" value={summary.kpis.total_assets} icon={<DevicesIcon />} color="primary.main" />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard title="Assigned" value={summary.kpis.total_assigned} icon={<AssignmentTurnedInIcon />} color="info.main" />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard title="Available" value={summary.kpis.total_available} icon={<CheckCircleIcon />} color="success.main" />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard title="Faulty / In Repair" value={summary.kpis.total_faulty} icon={<ErrorIcon />} color="error.main" />
    </Grid>
  </Grid>
)}

      {/* Charts */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 2, height: 380, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>Assets by Status</Typography>
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AssetPieChart
                  data={summary.by_status}
                  onSliceClick={handleStatusSliceClick}
                  activeFilter={statusFilter}
                />
                <CustomLegend data={summary.by_status} colors={LEGEND_COLORS} activeFilter={statusFilter} onClick={handleStatusSliceClick} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2, height: 380, display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>Assets by Type</Typography>
              <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AssetPieChart
                  data={summary.by_type}
                  onSliceClick={handleTypeSliceClick}
                  activeFilter={typeFilter}
                />
                <CustomLegend data={summary.by_type} colors={LEGEND_COLORS} activeFilter={typeFilter} onClick={handleTypeSliceClick} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Active Filters Display */}
      {(statusFilter || typeFilter || modelFilter || searchQuery) && (
        <Alert severity="info" sx={{ my: 2 }} onClose={clearAllFilters}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Active Filters (click X to clear):</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
            {searchQuery && <Chip label={`Search: "${searchQuery}"`} onDelete={() => setSearchQuery('')} />}
            {statusFilter && <Chip label={`Status: ${statusFilter}`} onDelete={() => setStatusFilter(null)} />}
            {typeFilter && <Chip label={`Type: ${typeFilter}`} onDelete={() => setTypeFilter(null)} />}
            {modelFilter && <Chip label={`Model: ${modelFilter}`} onDelete={() => setModelFilter(null)} />}
          </Stack>
        </Alert>
      )}
      
      {/* Global Error Display */}
      {error && !open && (
        <Alert severity="error" sx={{ my: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Data Table */}
      <Paper>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Serial Number</TableCell>
                <TableCell>Asset Type</TableCell>
                <TableCell>Model</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Location / Assigned To</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow hover key={asset.id}>
                  <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{asset.serial_number}</TableCell>
                  <TableCell>{asset.asset_type}</TableCell>
                  <TableCell>{asset.model || 'N/A'}</TableCell>
                  <TableCell>{getStatusChip(asset.status)}</TableCell>
                  <TableCell>
                    {asset.status === 'ASSIGNED' && asset.assigned_to_customer ? (
                      <Typography variant="body2" color="info.light" sx={{ fontWeight: 500 }}>
                        {asset.assigned_to_customer.user.full_name}
                      </Typography>
                    ) : (
                      asset.location || 'N/A'
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEdit(asset)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="History">
                        <IconButton size="small" onClick={() => handleOpenHistory(asset)}>
                          <HistoryIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(asset.id, asset.asset_type)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAssets.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No assets found{ (statusFilter || typeFilter || modelFilter || searchQuery) ? ' with the current filters.' : '.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create/Edit Asset Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditMode ? `Edit ${currentAsset.asset_type || 'Asset'} Details` : 'Create New Asset'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="serial_number"
            label="Serial Number"
            type="text"
            fullWidth
            value={currentAsset.serial_number || ''}
            onChange={handleChange}
            required={!isEditMode}
            disabled={isEditMode}
          />
          <TextField
            margin="dense"
            name="model"
            label="Model"
            type="text"
            fullWidth
            value={currentAsset.model || ''}
            onChange={handleChange}
          />
          <FormControl margin="dense" fullWidth disabled={isEditMode} required={!isEditMode}>
            <InputLabel>Asset Type *</InputLabel>
            <Select
              label="Asset Type *"
              name="asset_type"
              value={currentAsset.asset_type || 'ONT'}
              onChange={handleChange}
            >
              <MenuItem value="ONT">ONT</MenuItem>
              <MenuItem value="ROUTER">Router</MenuItem>
              <MenuItem value="FDH">FDH</MenuItem>
              <MenuItem value="SPLITTER">Splitter</MenuItem>
            </Select>
          </FormControl>
          
          {/* --- THIS IS THE FIX for point #2 --- */}
          {/* The dropdown is no longer fully disabled */}
          <FormControl margin="dense" fullWidth>
            <InputLabel>Status *</InputLabel>
            <Select
              label="Status *"
              name="status"
              value={currentAsset.status || 'AVAILABLE'}
              onChange={handleChange}
            >
              {/* These statuses can always be manually set */}
              <MenuItem value="AVAILABLE">Available</MenuItem>
              <MenuItem value="FAULTY">Faulty</MenuItem>
              <MenuItem value="IN_REPAIR">In Repair</MenuItem>
              <MenuItem value="RETIRED">Retired</MenuItem>
              
              {/* These are automatic. They are only selectable if they are already the current status */}
              <MenuItem 
                value="ASSIGNED" 
                disabled={currentAsset.status !== 'ASSIGNED'}
              >
                Assigned
              </MenuItem>
              <MenuItem 
                value="IN_USE" 
                disabled={currentAsset.status !== 'IN_USE'}
              >
                In Use
              </MenuItem>
            </Select>
          </FormControl>
          {/* --- END FIX --- */}
          
          <TextField
            margin="dense"
            name="location"
            label="Location (e.g., Warehouse, Site)"
            type="text"
            fullWidth
            value={currentAsset.location || ''}
            onChange={handleChange}
          />
          {error && open && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {isEditMode ? 'Save Changes' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Asset History for: {historyAssetSN}</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <List dense>
              {historyData.length === 0 && (
                <ListItem><ListItemText primary="No history found for this asset." /></ListItem>
              )}
              {historyData.map(entry => (
                <ListItem key={entry.id} divider>
                  <ListItemText
                    primary={
                      <Box component="span" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{entry.action}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {new Date(entry.timestamp).toLocaleString()}
                        </Typography>
                      </Box>
                    }
                    secondary={entry.details || 'No details recorded.'}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventoryPage;