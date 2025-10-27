// frontend/src/pages/PlannerDashboard.tsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  Box, Typography, Paper, Grid, List, ListItem, ListItemText, 
  Button, CircularProgress, Alert, Accordion, AccordionSummary, 
  AccordionDetails, Select, MenuItem, FormControl, InputLabel 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// --- Define our data types ---
interface Customer {
  id: number;
  user_id: number;
  address: string;
  status: string;
  splitter_port: number | null;
}

interface Splitter {
  id: number;
  name: string;
  port_capacity: number;
  customers: Customer[];
}

interface FDH {
  id: number;
  name: string;
  location: string;
  splitters: Splitter[];
}

// --- Onboarding Form Component (nested in the same file) ---

interface OnboardingFormProps {
  customer: Customer;
  fdhs: FDH[];
  onSuccess: () => void; // Function to refresh data on success
}

const OnboardingForm: React.FC<OnboardingFormProps> = ({ customer, fdhs, onSuccess }) => {
  const [selectedFdhId, setSelectedFdhId] = useState<string>('');
  const [selectedSplitterId, setSelectedSplitterId] = useState<string>('');
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedFdh = fdhs.find(f => f.id === Number(selectedFdhId));
  const selectedSplitter = selectedFdh?.splitters.find(s => s.id === Number(selectedSplitterId));

  const getAvailablePorts = () => {
    if (!selectedSplitter) return [];
    
    const usedPorts = new Set(selectedSplitter.customers.map(c => c.splitter_port));
    const allPorts = Array.from({ length: selectedSplitter.port_capacity }, (_, i) => i + 1);
    
    return allPorts.filter(port => !usedPorts.has(port));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const payload = {
        customer_profile_id: customer.id,
        splitter_id: Number(selectedSplitterId),
        splitter_port: Number(selectedPort),
      };
      
      await api.post('/onboard/', payload);
      onSuccess(); // Tell the parent to refetch data
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Onboarding failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, p: 2, border: '1px solid #333', borderRadius: '4px' }}>
      <Typography variant="h6" gutterBottom>Assign: {customer.address}</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth>
            <InputLabel>1. Select FDH</InputLabel>
            <Select
              value={selectedFdhId}
              label="1. Select FDH"
              onChange={(e) => {
                setSelectedFdhId(e.target.value);
                setSelectedSplitterId('');
                setSelectedPort('');
              }}
            >
              {fdhs.map((fdh) => (
                <MenuItem key={fdh.id} value={fdh.id}>{fdh.name} ({fdh.location})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth disabled={!selectedFdh}>
            <InputLabel>2. Select Splitter</InputLabel>
            <Select
              value={selectedSplitterId}
              label="2. Select Splitter"
              onChange={(e) => {
                setSelectedSplitterId(e.target.value);
                setSelectedPort('');
              }}
            >
              {selectedFdh?.splitters.map((splitter) => (
                <MenuItem key={splitter.id} value={splitter.id}>{splitter.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth disabled={!selectedSplitter}>
            <InputLabel>3. Select Port</InputLabel>
            <Select
              value={selectedPort}
              label="3. Select Port"
              onChange={(e) => setSelectedPort(e.target.value)}
            >
              {getAvailablePorts().map((port) => (
                <MenuItem key={port} value={port}>Port {port}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      
      <Button 
        type="submit" 
        variant="contained" 
        sx={{ mt: 2 }} 
        disabled={!selectedPort || loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Assign Customer'}
      </Button>
    </Box>
  );
};


// --- Main Planner Dashboard Component ---

export const PlannerDashboard: React.FC = () => {
  const [pendingCustomers, setPendingCustomers] = useState<Customer[]>([]);
  const [fdhs, setFdhs] = useState<FDH[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // This state tracks which customer is currently being onboarded
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch both data streams in parallel
      const [customerRes, fdhRes] = await Promise.all([
        api.get('/onboard/pending'),
        api.get('/hierarchy/fdh')
      ]);
      setPendingCustomers(customerRes.data);
      setFdhs(fdhRes.data);
    } catch (err) {
      setError('Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const handleOnboardSuccess = () => {
    setSelectedCustomerId(null); // Close the form
    fetchData(); // Refresh all data
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Grid container spacing={3}>
      
      {/* --- Column 1: Pending Customers --- */}
      <Grid item xs={12} md={5}>
        <Typography variant="h5" gutterBottom>Pending Onboarding</Typography>
        <Paper sx={{ maxHeight: '80vh', overflow: 'auto', p: 1 }}>
          <List>
            {pendingCustomers.length === 0 && (
              <ListItem><ListItemText primary="No pending customers." /></ListItem>
            )}
            {pendingCustomers.map((customer) => (
              <ListItem
                divider
                key={customer.id}
                secondaryAction={
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => setSelectedCustomerId(customer.id)}
                  >
                    Assign
                  </Button>
                }
              >
                <ListItemText 
                  primary={customer.address} 
                  secondary={`Status: ${customer.status}`} 
                />
              </ListItem>
            ))}
          </List>
        </Paper>
        
        {/* Render the Onboarding form if a customer is selected */}
        {selectedCustomerId && (
          <OnboardingForm 
            customer={pendingCustomers.find(c => c.id === selectedCustomerId)!}
            fdhs={fdhs}
            onSuccess={handleOnboardSuccess}
          />
        )}
      </Grid>
      
      {/* --- Column 2: Network Hierarchy --- */}
      <Grid item xs={12} md={7}>
        <Typography variant="h5" gutterBottom>Network Hierarchy</Typography>
        <Paper sx={{ maxHeight: '80vh', overflow: 'auto', p: 1 }}>
          {fdhs.map((fdh) => (
            <Accordion key={fdh.id} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{fdh.name} ({fdh.location})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {fdh.splitters.map((splitter) => {
                  const used = splitter.customers.length;
                  const capacity = splitter.port_capacity;
                  return (
                    <Accordion key={splitter.id} defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>
                          {splitter.name} (Load: {used} / {capacity})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          {splitter.customers.map((cust) => (
                            <ListItem key={cust.id}>
                              <ListItemText 
                                primary={`Port ${cust.splitter_port}: ${cust.address}`} 
                                secondary={`Status: ${cust.status}`} 
                              />
                            </ListItem>
                          ))}
                          {splitter.customers.length === 0 && (
                             <ListItem><ListItemText primary="No customers assigned." /></ListItem>
                          )}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  )
                })}
              </AccordionDetails>
            </Accordion>
          ))}
        </Paper>
      </Grid>
    </Grid>
  );
};