// frontend/src/pages/PlannerDashboard.tsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Box, Typography, Paper, Grid, List, ListItem, ListItemText,
  Button, CircularProgress, Alert, Accordion, AccordionSummary,
  AccordionDetails, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent // Import SelectChangeEvent
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SuggestionIcon from '@mui/icons-material/LightbulbOutlined';

// --- Define data types ---
interface Customer {
  id: number;
  user_id: number;
  address: string;
  status: string;
  splitter_port: number | null;
  pincode?: string; // Ensure pincode is expected
}
interface Splitter { id: number; name: string; port_capacity: number; customers: Customer[]; }
interface FDH { id: number; name: string; location: string; splitters: Splitter[]; pincode?: string; district?: string; region?: string; } // Added location fields
interface PortSuggestion { fdh_id: number; fdh_name: string; splitter_id: number; splitter_name: string; port_number: number; }

// --- Onboarding Form Component ---
interface OnboardingFormProps { customer: Customer; fdhs: FDH[]; onSuccess: () => void; }

const OnboardingForm: React.FC<OnboardingFormProps> = ({ customer, fdhs, onSuccess }) => {
  const [selectedFdhId, setSelectedFdhId] = useState<string>('');
  const [selectedSplitterId, setSelectedSplitterId] = useState<string>('');
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState<PortSuggestion[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const selectedFdh = fdhs.find(f => f.id === Number(selectedFdhId));
  const selectedSplitter = selectedFdh?.splitters.find(s => s.id === Number(selectedSplitterId));

  const getAvailablePorts = () => {
    if (!selectedSplitter) return [];
    const usedPorts = new Set(selectedSplitter.customers.map(c => c.splitter_port).filter(p => p !== null));
    const capacity = selectedSplitter.port_capacity || 8;
    const allPorts = Array.from({ length: capacity }, (_, i) => i + 1);
    return allPorts.filter(port => !usedPorts.has(port));
  };

  const handleSuggestPorts = async () => {
    setSuggestionLoading(true);
    setSuggestions([]);
    setError('');
    try {
      const res = await api.get(`/onboard/suggest_port/${customer.id}`);
      setSuggestions(res.data);
      if (res.data.length === 1) {
        const sug = res.data[0];
        setSelectedFdhId(String(sug.fdh_id));
        setTimeout(() => { // Delay for dependent dropdown state update
          setSelectedSplitterId(String(sug.splitter_id));
          setTimeout(() => { setSelectedPort(String(sug.port_number)); }, 50);
        }, 50);
      }
    } catch (err: any) {
      // Safe Error Handling
      let errorMessage = 'Failed to get port suggestions.';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMessage = typeof detail === 'string' ? detail : (Array.isArray(detail) && detail[0]?.msg ? detail[0].msg : JSON.stringify(detail));
      }
      setError(errorMessage);
    } finally {
      setSuggestionLoading(false);
    }
  };

  // --- *** ADDED/ENSURED handleSubmit IS PRESENT *** ---
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
      onSuccess(); // Callback to refresh parent data
    } catch (err: any) {
      // Safe Error Handling
      let errorMessage = 'Onboarding failed.';
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        errorMessage = typeof detail === 'string' ? detail : (Array.isArray(detail) && detail[0]?.msg ? detail[0].msg : JSON.stringify(detail));
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  // ----------------------------------------------------

  // Handler for Select changes
   const handleSelectChange = (event: SelectChangeEvent) => {
       const { name, value } = event.target;
       if (name === 'fdh') {
           setSelectedFdhId(value);
           setSelectedSplitterId(''); // Reset child dropdowns
           setSelectedPort('');
       } else if (name === 'splitter') {
           setSelectedSplitterId(value);
           setSelectedPort(''); // Reset child dropdown
       } else if (name === 'port') {
           setSelectedPort(value);
       }
   };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Assign: {customer.address} (Pincode: {customer.pincode || 'N/A'})</Typography>
        <Button
          variant="outlined" size="small"
          startIcon={suggestionLoading ? <CircularProgress size={16} /> : <SuggestionIcon />}
          onClick={handleSuggestPorts}
          disabled={suggestionLoading || !customer.pincode} // Button enabled if pincode exists
        >
          Suggest Ports
        </Button>
      </Box>

      {/* --- *** ENSURE DROPDOWNS ARE PRESENT *** --- */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel>1. Select FDH</InputLabel>
            <Select
              name="fdh" // Added name
              value={selectedFdhId}
              label="1. Select FDH"
              onChange={handleSelectChange} // Use combined handler
            >
              {fdhs.map((fdh) => (
                <MenuItem key={fdh.id} value={fdh.id}>{fdh.name} ({fdh.location})</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth disabled={!selectedFdh} size="small">
            <InputLabel>2. Select Splitter</InputLabel>
            <Select
              name="splitter" // Added name
              value={selectedSplitterId}
              label="2. Select Splitter"
              onChange={handleSelectChange} // Use combined handler
            >
              {selectedFdh?.splitters.map((splitter) => (
                <MenuItem key={splitter.id} value={splitter.id}>{splitter.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth disabled={!selectedSplitter} size="small">
            <InputLabel>3. Select Port</InputLabel>
            <Select
              name="port" // Added name
              value={selectedPort}
              label="3. Select Port"
              onChange={handleSelectChange} // Use combined handler
            >
              {getAvailablePorts().map((port) => (
                <MenuItem key={port} value={port}>Port {port}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      {/* ------------------------------------------ */}

      {/* --- Display Suggestions --- */}
      {suggestions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Suggestions:</Typography>
          <List dense sx={{ maxHeight: 150, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {suggestions.map((sug, index) => (
              <ListItem
                key={index}
                button // Make it look clickable
                onClick={() => {
                  setSelectedFdhId(String(sug.fdh_id));
                  setTimeout(() => {
                    setSelectedSplitterId(String(sug.splitter_id));
                    setTimeout(() => { setSelectedPort(String(sug.port_number)); }, 50);
                  }, 50);
                }}
              >
                <ListItemText primary={`${sug.fdh_name} -> ${sug.splitter_name} -> Port ${sug.port_number}`} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={!selectedPort || loading}>
        {loading ? <CircularProgress size={24} /> : 'Assign Customer'}
      </Button>
    </Box>
  );
};

// --- Main Planner Dashboard Component ---
export const PlannerDashboard: React.FC = () => {
  const [pendingCustomers, setPendingCustomers] = useState<Customer[]>([]);
  const [fdhs, setFdhs] = useState<FDH[]>([]); // This holds FDH data for dropdowns AND hierarchy view
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch pending customers (ensure pincode is included)
      const customerRes = await api.get('/onboard/pending');
      // Fetch hierarchy (ensure FDHs have location fields)
      const fdhRes = await api.get('/hierarchy/fdh');

      // Basic validation
      if (!Array.isArray(customerRes.data)) throw new Error("Invalid customer data received");
      if (!Array.isArray(fdhRes.data)) throw new Error("Invalid FDH data received");

      setPendingCustomers(customerRes.data);
      setFdhs(fdhRes.data);
    } catch (err: any) {
       console.error("Fetch data error:", err);
       setError(err.message || 'Failed to fetch initial dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOnboardSuccess = () => {
    setSelectedCustomerId(null); // Close the form
    fetchData(); // Refresh both customer list and hierarchy view
  };

  if (loading) return <CircularProgress />;

  // Find the selected customer object (make sure it includes pincode)
  const selectedCustomerData = selectedCustomerId ? pendingCustomers.find(c => c.id === selectedCustomerId) : null;

  return (
    <Grid container spacing={3}>
      {/* Column 1: Pending Customers */}
      <Grid item xs={12} md={5}>
        <Typography variant="h5" gutterBottom>Pending Onboarding</Typography>
         {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>} {/* Show fetch errors here */}
        <Paper sx={{ maxHeight: 'calc(80vh - 100px)', overflow: 'auto', p: 1 }}> {/* Adjusted height */}
          <List>
            {pendingCustomers.length === 0 && !loading && (
              <ListItem><ListItemText primary="No pending customers." /></ListItem>
            )}
            {pendingCustomers.map((customer) => (
              <ListItem divider key={customer.id}
                secondaryAction={
                  <Button variant="outlined" size="small"
                    onClick={() => { setSelectedCustomerId(customer.id); setError(''); }} // Clear errors on assign click
                  > Assign </Button>
                }
              >
                <ListItemText
                  primary={customer.address}
                  secondary={`Pincode: ${customer.pincode || 'N/A'} | Status: ${customer.status}`} // Show pincode here too
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Render the Onboarding form if a customer is selected */}
        {selectedCustomerData && ( // Use the found customer data object
          <OnboardingForm
            customer={selectedCustomerData} // Pass the full customer object
            fdhs={fdhs} // Pass FDH data for dropdowns
            onSuccess={handleOnboardSuccess}
          />
        )}
      </Grid>

      {/* Column 2: Network Hierarchy */}
      <Grid item xs={12} md={7}>
        <Typography variant="h5" gutterBottom>Network Hierarchy View</Typography>
        <Paper sx={{ maxHeight: '80vh', overflow: 'auto', p: 1 }}>
          {fdhs.map((fdh) => (
            <Accordion key={`hierarchy-fdh-${fdh.id}`} sx={{ mb: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                {/* Display more FDH details if available */}
                <Typography variant="h6">{fdh.name} ({fdh.district ? `${fdh.district} - ${fdh.location}` : fdh.location || 'N/A'}) Pincode: {fdh.pincode || 'N/A'}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {fdh.splitters.map((splitter) => {
                  const used = splitter.customers.length;
                  const capacity = splitter.port_capacity || 8;
                  return (
                    <Accordion key={`hierarchy-splitter-${splitter.id}`} defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{splitter.name} (Load: {used}/{capacity})</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List dense>
                          {splitter.customers.map((cust) => (
                            <ListItem key={`hierarchy-cust-${cust.id}`}>
                              <ListItemText
                                primary={`Port ${cust.splitter_port}: ${cust.address}`}
                                secondary={`Status: ${cust.status}`} // Device type isn't in this fdh data, only status
                              />
                            </ListItem>
                          ))}
                          {splitter.customers.length === 0 && (
                             <ListItem><ListItemText primary="No customers assigned to this splitter." /></ListItem>
                          )}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
                 {fdh.splitters.length === 0 && (
                     <Typography sx={{ p: 1, fontStyle: 'italic', color: 'text.secondary' }}>No splitters found for this FDH.</Typography>
                 )}
              </AccordionDetails>
            </Accordion>
          ))}
           {fdhs.length === 0 && !loading && (
               <Typography sx={{ p: 2, fontStyle: 'italic', color: 'text.secondary' }}>No FDH data available.</Typography>
           )}
        </Paper>
      </Grid>
    </Grid>
  );
};