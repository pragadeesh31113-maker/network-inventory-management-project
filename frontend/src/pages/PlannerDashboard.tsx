// frontend/src/pages/PlannerDashboard.tsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  Box, Typography, Paper, Grid, List, ListItem, ListItemText, 
  Button, CircularProgress, Alert, Accordion, AccordionSummary, 
  AccordionDetails, Select, MenuItem, FormControl, InputLabel 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SuggestionIcon from '@mui/icons-material/LightbulbOutlined'; // Icon for suggestions
// --- Define our data types ---
interface Customer {
  id: number;
  user_id: number;
  address: string;
  status: string;
  splitter_port: number | null;
  pincode?: string;
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
interface PortSuggestion {
    fdh_id: number;
    fdh_name: string;
    splitter_id: number;
    splitter_name: string;
    port_number: number;
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
  const [suggestions, setSuggestions] = useState<PortSuggestion[]>([]); // <-- State for suggestions
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const selectedFdh = fdhs.find(f => f.id === Number(selectedFdhId));
  const selectedSplitter = selectedFdh?.splitters.find(s => s.id === Number(selectedSplitterId));

  const getAvailablePorts = () => {
    if (!selectedSplitter) return [];
    
    const usedPorts = new Set(selectedSplitter.customers.map(c => c.splitter_port));
    const allPorts = Array.from({ length: selectedSplitter.port_capacity }, (_, i) => i + 1);
    
    return allPorts.filter(port => !usedPorts.has(port));
  };

const handleSuggestPorts = async () => {
    setSuggestionLoading(true);
    setSuggestions([]); // Clear previous suggestions
    setError('');
    try {
      const res = await api.get(`/onboard/suggest_port/${customer.id}`);
      setSuggestions(res.data);
      // Optionally pre-fill if only one suggestion
      if (res.data.length === 1) {
          const sug = res.data[0];
          setSelectedFdhId(String(sug.fdh_id));
          // Need a slight delay for splitter dropdown to populate based on FDH
          setTimeout(() => {
             setSelectedSplitterId(String(sug.splitter_id));
             // Delay again for port dropdown
             setTimeout(() => {
                setSelectedPort(String(sug.port_number));
             }, 50);
          }, 50);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to get port suggestions.');
    } finally {
      setSuggestionLoading(false);
    }
  };
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Stop the form from reloading the page
    setError('');
    setLoading(true);
    
    try {
      const payload = {
        customer_profile_id: customer.id,
        splitter_id: Number(selectedSplitterId),
        splitter_port: Number(selectedPort),
      };
      
      await api.post('/onboard/', payload);
      onSuccess(); // Tell the parent (PlannerDashboard) to refetch data
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Onboarding failed.');
    } finally {
      setLoading(false);
    }
  };
  // ---------------------------------

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, p: 2, border: '1px solid #333', borderRadius: '4px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
         <Typography variant="h6">Assign: {customer.address} (Pincode: {customer.pincode || 'N/A'})</Typography> {/* Show pincode */}
         {/* --- NEW: Suggest Button --- */}
         <Button
            variant="outlined"
            size="small"
            startIcon={suggestionLoading ? <CircularProgress size={16} /> : <SuggestionIcon />}
            onClick={handleSuggestPorts}
            disabled={suggestionLoading || !customer.pincode}
         >
            Suggest Ports
         </Button>
         {/* ------------------------- */}
      </Box>
      <Grid container spacing={2}>
        {/* ... (FDH, Splitter, Port Select dropdowns remain the same) ... */}
      </Grid>

      {/* --- NEW: Display Suggestions --- */}
      {suggestions.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2">Suggestions:</Typography>
          <List dense sx={{ maxHeight: 150, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {suggestions.map((sug, index) => (
              <ListItem
                key={index}
                button
                onClick={() => { // Click suggestion to pre-fill
                    setSelectedFdhId(String(sug.fdh_id));
                    // Need delays again for dependent dropdowns
                    setTimeout(() => {
                       setSelectedSplitterId(String(sug.splitter_id));
                       setTimeout(() => {
                          setSelectedPort(String(sug.port_number));
                       }, 50);
                    }, 50);
                }}
              >
                <ListItemText primary={`${sug.fdh_name} -> ${sug.splitter_name} -> Port ${sug.port_number}`} />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
      {/* ----------------------------- */}

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