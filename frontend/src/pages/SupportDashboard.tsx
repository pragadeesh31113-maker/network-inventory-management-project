// frontend/src/pages/SupportDashboard.tsx
import React, { useState } from 'react';
import api from '../api'; // <-- This will now be used
import { 
  Box, Typography, Paper, CircularProgress, Alert, 
  TextField, Button, List, ListItem, ListItemText, 
  Grid, Chip, Dialog, DialogTitle, DialogActions, DialogContent, DialogContentText, 
  InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import MemoryIcon from '@mui/icons-material/Memory';
import RouterIcon from '@mui/icons-material/Router';

interface CustomerDetails {
  full_name: string;
  email: string;
  address: string;
  plan: string;
  status: string;
  assigned_assets: {
    model: string;
    asset_type: string;
    serial_number: string;
  }[];
}

interface CustomerSearchResult {
  id: number;
  address: string;
  status: string;
}

export const SupportDashboard: React.FC = () => {
  // --- FIX: ADDED ALL THE MISSING STATE HOOKS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  // ---------------------------------------------

  // --- FIX: ADDED FULL FUNCTION IMPLEMENTATION ---
  const handleSearch = async () => {
    if (searchTerm.length < 3) {
      setError('Search term must be at least 3 characters.');
      return;
    }
    setLoading(true);
    setError('');
    setSelectedCustomer(null);
    try {
      const res = await api.get(`/api/customers/search?q=${searchTerm}`);
      setResults(res.data);
    } catch (err) {
      setError('Search failed.');
    } finally {
      setLoading(false);
    }
  };
  
  // --- FIX: ADDED FULL FUNCTION IMPLEMENTATION ---
  const handleSelectCustomer = async (customerId: number) => {
    setLoading(true);
    setError('');
    setSelectedCustomerId(customerId);
    try {
      const res = await api.get(`/api/customers/${customerId}/details`);
      setSelectedCustomer(res.data);
    } catch (err) {
      setError('Failed to fetch customer details.');
    } finally {
      setLoading(false);
    }
  };

  // --- FIX: ADDED FULL FUNCTION IMPLEMENTATION ---
  const handleDeactivate = async () => {
    if (!selectedCustomerId) return;
    setLoading(true);
    try {
      await api.post(`/api/lifecycle/deactivate/${selectedCustomerId}`);
      handleSelectCustomer(selectedCustomerId); // Refresh details
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Deactivation failed.');
    } finally {
      setLoading(false);
      setOpenDialog(false);
    }
  };

  const getStatusChip = (status: string) => {
    if (status === 'ACTIVE') return <Chip label="Active" color="success" />;
    if (status === 'INACTIVE') return <Chip label="Inactive" color="error" variant="outlined" />;
    if (status === 'PENDING_INSTALLATION') return <Chip label="Pending Install" color="warning" />;
    if (status === 'PENDING_ONBOARDING') return <Chip label="Pending Onboarding" color="info" />;
    return <Chip label={status} color="default" />;
  };
  
  const getAssetIcon = (type: string) => {
    if (type === 'ONT') return <MemoryIcon sx={{mr: 1}} />;
    if (type === 'ROUTER') return <RouterIcon sx={{mr: 1}} />;
    return null;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Customer Support</Typography>
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Find Customer</Typography>
        <Box 
          component="form"
          onSubmit={(e) => { e.preventDefault(); handleSearch(); }} 
          sx={{ display: 'flex', gap: 1, mt: 2 }}
        >
          <TextField 
            label="Search by username, email, or address"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <Button 
            type="submit"
            variant="contained" 
            disabled={loading}
            sx={{px: 4}}
          >
            {loading ? <CircularProgress size={24} /> : 'Search'}
          </Button>
        </Box>
      </Paper>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Typography variant="h6" gutterBottom>Search Results</Typography>
          <Paper sx={{maxHeight: '60vh', overflow: 'auto'}}>
            <List>
              {loading && <CircularProgress sx={{m: 2}} />}
              {!loading && results.length === 0 && <ListItem><ListItemText primary="No results" /></ListItem>}
              {results.map((cust) => (
                <ListItem 
                  divider
                  button 
                  key={cust.id} 
                  onClick={() => handleSelectCustomer(cust.id)}
                  selected={selectedCustomerId === cust.id}
                >
                  <ListItemText primary={cust.address} secondary={getStatusChip(cust.status)} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Typography variant="h6" gutterBottom>Customer Details</Typography>
          {selectedCustomer ? (
            <Paper sx={{ p: 3 }}>
              <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5}}>
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
                  <AccountCircleIcon fontSize="large" color="primary" />
                  <Typography variant="h5">{selectedCustomer.full_name}</Typography>
                </Box>
                {getStatusChip(selectedCustomer.status)}
              </Box>
              
              <Typography sx={{mb: 0.5}}><strong>Email:</strong> {selectedCustomer.email}</Typography>
              <Typography><strong>Address:</strong> {selectedCustomer.address}</Typography>
              <Typography><strong>Plan:</strong> {selectedCustomer.plan || 'N/A'}</Typography>
              
              <Typography variant="h6" sx={{ mt: 3, mb: 1.5 }}>Assigned Equipment</Typography>
              {selectedCustomer.assigned_assets.map(asset => (
                <Box key={asset.serial_number} sx={{display: 'flex', alignItems: 'center', mb: 1}}>
                  {getAssetIcon(asset.asset_type)}
                  <Typography><strong>{asset.asset_type}:</strong> {asset.model} (SN: {asset.serial_number})</Typography>
                </Box>
              ))}
              
              <Button 
                variant="contained" 
                color="error" 
                sx={{ mt: 3 }}
                onClick={() => setOpenDialog(true)}
                disabled={selectedCustomer.status === 'INACTIVE'}
              >
                Deactivate Customer
              </Button>
            </Paper>
          ) : (
             <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', borderStyle: 'dashed' }}>
                <Typography color="text.secondary">Select a customer from the search results to see details.</Typography>
             </Paper>
          )}
        </Grid>
      </Grid>
      
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Deactivate Customer?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to deactivate {selectedCustomer?.full_name}? 
            This will return all assigned assets to inventory and free their splitter port.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleDeactivate} color="error" variant="contained" autoFocus>
            Confirm Deactivation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};