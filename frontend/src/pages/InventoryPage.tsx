// frontend/src/pages/InventoryPage.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api';
import {
  Box, Typography, Button, CircularProgress, Alert, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton,
  Grid, List, ListItem, ListItemText, SelectChangeEvent, Stack, AlertTitle
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
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ClearAllIcon from '@mui/icons-material/ClearAll';

// --- Types ---
type AssetStatus = "AVAILABLE" | "ASSIGNED" | "FAULTY" | "IN_REPAIR" | "RETIRED";
type AssetType = "ONT" | "ROUTER" | "SPLITTER" | "FDH";

interface Asset {
  id: number;
  serial_number: string;
  model: string | null;
  asset_type: AssetType;
  status: AssetStatus;
  location: string | null;
  assigned_to_customer_id: number | null;
  pincode?: string | null;
  district?: string | null;
  region?: string | null;
}

interface AssetHistory {
  id: number;
  timestamp: string;
  action: string;
  details: string | null;
  changed_by_user_id: number | null;
  // user: { username: string } | null; // Uncomment if your API populates this
}

interface SummaryData {
  kpis: {
    total_assets: number;
    total_assigned: number;
    total_available: number;
    total_faulty: number;
  };
  by_status: { name: string, value: number }[];
  by_type: { name: string, value: number }[];
}

// This MUST match the FDH schema returned by your /api/hierarchy/{id} endpoint
interface FDHHierarchyDetails {
  id: number; // This is the Asset ID
  name: string; // This is the FDH (asset) serial_number or model
  location: string | null;
  pincode: string | null;
  district: string | null;
  region: string | null;
}

const emptyAsset: Partial<Asset> = {
  serial_number: '',
  model: '',
  asset_type: 'ONT',
  status: 'AVAILABLE',
  location: 'Central Warehouse',
  district: '',
  region: '',
  pincode: ''
};

// Colors for the Legend
const LEGEND_COLORS: { [key: string]: string } = {
  AVAILABLE: '#00C49F', ASSIGNED: '#0088FE', FAULTY: '#FF8042',
  IN_REPAIR: '#FFBB28', RETIRED: '#B0B0B0',
  ONT: '#8884D8', ROUTER: '#82CA9D', SPLITTER: '#FF7F0E', FDH: '#1F77B4',
};

// --- Main Component ---
export const InventoryPage: React.FC = () => {
  // --- State Variables ---
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog States
  const [open, setOpen] = useState(false); // Standard Dialog
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
  
  // FDH Dialog States
  const [fdhLocationData, setFdhLocationData] = useState<FDHHierarchyDetails>({ id: 0, name: '', location: '', pincode: '', district: '', region: '' });
  const [fdhLocationDialogOpen, setFdhLocationDialogOpen] = useState(false);
  const [fdhLoading, setFdhLoading] = useState(false);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    setError('');
    setLoading(true); 
    try {
      // Use the correct API routes we found
      const [summaryResponse, assetsResponse] = await Promise.all([
        api.get<SummaryData>('/assets/summary'),
        api.get<Asset[]>('/assets/') 
      ]);

      setSummary(summaryResponse.data);
      setAssets(assetsResponse.data);

    } catch (err: any) {
      console.error("Failed to fetch inventory data:", err);
      const message = err.response?.data?.message || 'Failed to load inventory. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run fetchData once on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate unique models for the filter dropdown
  const uniqueModels = useMemo(() => {
    const models = new Set(assets
      .map(asset => asset.model)
      .filter((model): model is string => !!model) // Filter out null/undefined
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
    if (asset.asset_type === 'FDH') {
      // Open the specific FDH location dialog
      setFdhLoading(true);
      setFdhLocationDialogOpen(true);
      try {
        // Use the /api/hierarchy/ route we found
        const response = await api.get<FDHHierarchyDetails>(`/hierarchy/${asset.id}`);
        setFdhLocationData(response.data);
      } catch (err: any) {
        setError('Failed to load FDH location data.');
        setFdhLocationDialogOpen(false); // Close dialog on error
      } finally {
        setFdhLoading(false);
      }
    } else {
      // Open the standard asset dialog
      setCurrentAsset(asset);
      setIsEditMode(true);
      setOpen(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFdhLocationDialogOpen(false);
    setError('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setCurrentAsset(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFdhLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFdhLocationData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setError('');
    try {
      if (isEditMode) {
        // Update existing asset - /api/assets/{asset_id}
        await api.put(`/assets/${currentAsset.id}`, currentAsset);
      } else {
        // Create new asset - /api/assets/
        await api.post('/assets/', currentAsset);
      }
      handleClose(); // Close dialog
      fetchData();   // Refresh data in the table
    } catch (err: any) {
      console.error("Failed to save asset:", err);
      setError(err.response?.data?.message || 'Failed to save asset.');
    }
  };
  
  const handleSaveFdhLocation = async () => {
    setError('');
    setFdhLoading(true);
    try {
      // Use the /api/hierarchy/ route
      await api.put(`/hierarchy/${fdhLocationData.id}`, fdhLocationData);
      handleClose();
      fetchData(); // Refresh all data
    } catch (err: any) {
      console.error("Failed to save FDH location:", err);
      setError(err.response?.data?.message || 'Failed to save FDH location.');
    } finally {
      setFdhLoading(false);
    }
  };

  const handleDelete = async (assetId: number, assetType: AssetType) => {
    // Use a simple window.confirm for safety
    if (window.confirm(`Are you sure you want to delete this ${assetType}? This action cannot be undone.`)) {
      try {
        // Use /api/assets/{asset_id}
        await api.delete(`/assets/${assetId}`);
        fetchData(); // Refresh data
      } catch (err: any) {
        console.error("Failed to delete asset:", err);
        setError(err.response?.data?.message || 'Failed to delete asset.');
      }
    }
  };

  const handleOpenHistory = async (asset: Asset) => {
    setHistoryAssetSN(asset.serial_number);
    setHistoryLoading(true);
    setHistoryOpen(true);
    setError(''); // Clear main page error
    try {
      // Use /api/assets/{asset_id}/history
      const response = await api.get<AssetHistory[]>(`/assets/${asset.id}/history`);
      setHistoryData(response.data);
    } catch (err: any) {
      console.error("Failed to fetch history:", err);
      setHistoryData([]); // Clear old data
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusChip = (status: AssetStatus): React.ReactElement | null => {
    const colorMap: Record<AssetStatus, "success" | "info" | "error" | "warning" | "default"> = {
      AVAILABLE: 'success', ASSIGNED: 'info', FAULTY: 'error',
      IN_REPAIR: 'warning', RETIRED: 'default',
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
  
  const clearAllFilters = () => {
    setStatusFilter(null);
    setTypeFilter(null);
    setModelFilter(null);
  }

  // --- Memoized Filtered Data ---
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      if (statusFilter && asset.status !== statusFilter) return false;
      if (typeFilter && asset.asset_type !== typeFilter) return false;
      if (modelFilter && asset.model !== modelFilter) return false;
      return true;
    });
  }, [assets, statusFilter, typeFilter, modelFilter]);

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
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 240 }} size="small">
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
          <StatCard title="Total Assets" value={summary.kpis.total_assets} icon={<DevicesIcon />} color="primary.main" />
          <StatCard title="Assigned" value={summary.kpis.total_assigned} icon={<AssignmentTurnedInIcon />} color="info.main" />
          <StatCard title="Available" value={summary.kpis.total_available} icon={<CheckCircleIcon />} color="success.main" />
          <StatCard title="Faulty / In Repair" value={summary.kpis.total_faulty} icon={<ErrorIcon />} color="error.main" />
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
      {(statusFilter || typeFilter || modelFilter) && (
        <Alert severity="info" sx={{ my: 2 }} onClose={clearAllFilters}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Active Filters (click X to clear):</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {statusFilter && <Chip label={`Status: ${statusFilter}`} onDelete={() => setStatusFilter(null)} />}
            {typeFilter && <Chip label={`Type: ${typeFilter}`} onDelete={() => setTypeFilter(null)} />}
            {modelFilter && <Chip label={`Model: ${modelFilter}`} onDelete={() => setModelFilter(null)} />}
          </Stack>
        </Alert>
      )}
      
      {/* Global Error Display */}
      {error && !open && !fdhLocationDialogOpen && (
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
                <TableCell>Location</TableCell>
                <TableCell>Assigned Customer</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAssets.map((asset) => (
                <TableRow hover key={asset.id}>
                  <TableCell sx={{ fontWeight: 600 }}>{asset.serial_number}</TableCell>
                  <TableCell>{asset.asset_type}</TableCell>
                  <TableCell>{asset.model || 'N/A'}</TableCell>
                  <TableCell>{getStatusChip(asset.status)}</TableCell>
                  <TableCell>{asset.location || 'N/A'}</TableCell>
                  <TableCell>{asset.assigned_to_customer_id || '---'}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                      <IconButton title="Edit" size="small" onClick={() => handleOpenEdit(asset)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton title="History" size="small" onClick={() => handleOpenHistory(asset)}>
                        <HistoryIcon />
                      </IconButton>
                      <IconButton title="Delete" size="small" onClick={() => handleDelete(asset.id, asset.asset_type)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {/* No results message */}
              {filteredAssets.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No assets found{ (statusFilter || typeFilter || modelFilter) ? ' with the current filters.' : '.'}
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
              <MenuItem value="SPLITTER">Splitter</MenuItem>
              <MenuItem value="FDH">FDH</MenuItem>
            </Select>
          </FormControl>
          <FormControl margin="dense" fullWidth>
            <InputLabel>Status *</InputLabel>
            <Select
              label="Status *"
              name="status"
              value={currentAsset.status || 'AVAILABLE'}
              onChange={handleChange}
            >
              <MenuItem value="AVAILABLE">Available</MenuItem>
              <MenuItem value="ASSIGNED">Assigned</MenuItem>
              <MenuItem value="FAULTY">Faulty</MenuItem>
              <MenuItem value="IN_REPAIR">In Repair</MenuItem>
              <MenuItem value="RETIRED">Retired</MenuItem>
            </Select>
          </FormControl>
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

      {/* FDH Location Edit Dialog */}
      <Dialog open={fdhLocationDialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Update FDH Location (Cascades)</DialogTitle>
        <DialogContent>
          {fdhLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <>
              <Alert severity="warning" sx={{ mb: 2 }}>Changing these details may cascade to all child assets (Splitters, ONTs) at this location.</Alert>
              <TextField
                autoFocus
                margin="dense"
                name="location"
                label="Location Name"
                type="text"
                fullWidth
                value={fdhLocationData.location || ''}
                onChange={handleFdhLocationChange}
              />
              <TextField
                margin="dense"
                name="pincode"
                label="Pincode"
                type="text"
                fullWidth
                value={fdhLocationData.pincode || ''}
                onChange={handleFdhLocationChange}
              />
              <TextField
                margin="dense"
                name="district"
                label="District"
                type="text"
                fullWidth
                value={fdhLocationData.district || ''}
                onChange={handleFdhLocationChange}
              />
              <TextField
                margin="dense"
                name="region"
                label="Region"
                type="text"
                fullWidth
                value={fdhLocationData.region || ''}
                onChange={handleFdhLocationChange}
              />
              {error && fdhLocationDialogOpen && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSaveFdhLocation} variant="contained" disabled={fdhLoading}>
            {fdhLoading ? <CircularProgress size={24} /> : 'Save Location'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Asset History: {historyAssetSN}</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>
          ) : historyData.length > 0 ? (
            <List dense>
              {historyData.map((entry) => (
                <ListItem key={entry.id} divider>
                  <ListItemText
                    primary={entry.action}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" color="text.primary">
                          {new Date(entry.timestamp).toLocaleString()}
                        </Typography>
                        {entry.details && ` - ${entry.details}`}
                        {/* You would get username from a populated user object */}
                        {entry.changed_by_user_id && ` (User ID: ${entry.changed_by_user_id})`}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>No history found for this asset.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
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
  <Stack direction="column" spacing={0.5} sx={{ ml: 4, my: 'auto', flexShrink: 0 }}>
    {data.map((entry) => (
      <Box
        key={`legend-${entry.name}`}
        sx={{
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          opacity: activeFilter && activeFilter !== entry.name ? 0.6 : 1,
          fontWeight: activeFilter === entry.name ? 'bold' : 'normal',
          '&:hover': { opacity: 0.8 },
          transition: 'opacity 0.2s',
        }}
        onClick={() => onClick(entry.name)}
      >
        <Box sx={{ width: 16, height: 16, borderRadius: '4px', bgcolor: colors[entry.name] || '#A0A0A0', mr: 1 }} />
        <Typography variant="body2">{entry.name} ({entry.value})</Typography>
      </Box>
    ))}
  </Stack>
);