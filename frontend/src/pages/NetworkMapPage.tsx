// frontend/src/pages/NetworkMapPage.tsx
import React, { useState, useEffect } from 'react';
import api from '../api';
import {
  Box, Typography, CircularProgress, Alert, Paper, // Added Paper
  Accordion, AccordionSummary, AccordionDetails, List, ListItem,
  ListItemIcon, ListItemText, Chip, Divider, LinearProgress, // Added LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StorageIcon from '@mui/icons-material/Storage'; // FDH
import CallSplitIcon from '@mui/icons-material/CallSplit'; // Splitter
import MemoryIcon from '@mui/icons-material/Memory'; // ONT
import RouterIcon from '@mui/icons-material/Router'; // Router
import CableIcon from '@mui/icons-material/Cable'; // Generic device or empty port
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Active status
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline'; // Inactive status
import PendingIcon from '@mui/icons-material/Pending'; // Pending status
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // Faulty/Other status

// --- Define Hierarchy Types ---
interface CustomerSimple {
  id: number;
  address: string;
  splitter_port: number | null;
  status: string;
  device_type: 'ONT' | 'ROUTER' | 'UNKNOWN';
}

interface SplitterSimple {
  id: number;
  name: string;
  port_capacity: number;
  customers: CustomerSimple[];
}

interface FDHSimple {
  id: number;
  name: string;
  location: string;
  splitters: SplitterSimple[];
}

// Helper function to get the appropriate icon for the device type
const getDeviceIcon = (deviceType: string | undefined) => {
  switch (deviceType) {
    case 'ONT': return <MemoryIcon sx={{ color: 'warning.main' }} />; // Yellowish
    case 'ROUTER': return <RouterIcon sx={{ color: 'info.main' }} />; // Blue/Purple
    default: return <CableIcon sx={{ color: 'action.disabled' }} />; // Grey for unknown/empty
  }
};

// Helper function to get a status chip
const getStatusChip = (status: string | undefined) => {
  switch (status?.toUpperCase()) { // Use uppercase for robust matching
    case 'ACTIVE':
      return <Chip label="Active" color="success" size="small" icon={<CheckCircleIcon />} sx={{ ml: 1 }} />;
    case 'INACTIVE':
      return <Chip label="Inactive" color="error" variant="outlined" size="small" icon={<PauseCircleOutlineIcon />} sx={{ ml: 1 }} />;
    case 'PENDING_INSTALLATION':
      return <Chip label="Pending Install" color="warning" size="small" icon={<PendingIcon />} sx={{ ml: 1 }} />;
    case 'PENDING_ONBOARDING':
        return <Chip label="Pending Onboarding" color="info" size="small" icon={<PendingIcon />} sx={{ ml: 1 }} />;
    case 'FAULTY': // Assuming assets might have faulty status linked to customer
         return <Chip label="Faulty" color="error" size="small" icon={<ErrorOutlineIcon />} sx={{ ml: 1 }} />;
    default:
      return status ? <Chip label={status} size="small" sx={{ ml: 1 }} /> : null; // Default chip or nothing
  }
};

// --- Main Component ---
export const NetworkMapPage: React.FC = () => {
  const [hierarchy, setHierarchy] = useState<FDHSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHierarchy = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get('/hierarchy/fdh');
        // Basic validation of received data structure (optional but good practice)
        if (!Array.isArray(res.data)) {
            throw new Error("Invalid data format received from API.");
        }
        setHierarchy(res.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load network hierarchy data.');
        console.error("Hierarchy fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHierarchy();
  }, []);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (hierarchy.length === 0) return <Alert severity="info">No network hierarchy data found.</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>Network Hierarchy</Typography>

      {hierarchy.map((fdh) => (
        <Paper key={`fdh-paper-${fdh.id}`} elevation={2} sx={{ mb: 2 }}> {/* Wrap FDH in Paper */}
          <Accordion defaultExpanded>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`fdh-${fdh.id}-content`}
              id={`fdh-${fdh.id}-header`}
              sx={{ backgroundColor: 'action.hover' }}
            >
              <ListItemIcon sx={{ minWidth: 40, alignSelf: 'center' }}> {/* Center icon */}
                <StorageIcon sx={{ color: 'primary.main' }}/>
              </ListItemIcon>
              <Box>
                <Typography variant="h6">{fdh.name}</Typography>
                <Typography variant="body2" color="text.secondary">{fdh.location || 'No location specified'}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, borderTop: '1px solid', borderColor: 'divider' }}>
              {fdh.splitters.length === 0 && (
                <Typography sx={{ p: 2, fontStyle: 'italic', color: 'text.secondary' }}>No splitters configured for this FDH.</Typography>
              )}
              {fdh.splitters.map((splitter, splitterIndex) => {
                const usedPorts = splitter.customers.length;
                const capacity = splitter.port_capacity || 8; // Default to 8 if not provided
                const loadPercentage = capacity > 0 ? (usedPorts / capacity) * 100 : 0;

                const customerMap = new Map<number, CustomerSimple>();
                splitter.customers.forEach(cust => {
                  if (cust.splitter_port !== null) {
                    customerMap.set(cust.splitter_port, cust);
                  }
                });

                return (
                  // Add elevation to splitter accordions for visual separation
                  <Accordion key={`splitter-${splitter.id}`} TransitionProps={{ unmountOnExit: true }} elevation={1} square={splitterIndex !== 0} >
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}
                      aria-controls={`splitter-${splitter.id}-content`}
                      id={`splitter-${splitter.id}-header`}
                    >
                      <ListItemIcon sx={{ minWidth: 40, alignSelf: 'center' }}>
                        <CallSplitIcon sx={{ color: '#00C49F' }}/>
                      </ListItemIcon>
                      <Box sx={{ width: '100%', mr: 2 }}> {/* Take full width for progress bar */}
                        <Typography variant="subtitle1" fontWeight="medium">{splitter.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                           <LinearProgress
                             variant="determinate"
                             value={loadPercentage}
                             sx={{ height: 8, borderRadius: 4, flexGrow: 1, mr: 1 }}
                             color={loadPercentage > 80 ? 'error' : (loadPercentage > 60 ? 'warning' : 'success')}
                           />
                           <Typography variant="caption" color="text.secondary">{usedPorts}/{capacity}</Typography>
                        </Box>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ borderTop: '1px solid', borderColor: 'divider', p: 0 }}>
                      <List dense disablePadding>
                        {Array.from({ length: capacity }, (_, i) => i + 1).map((portNum) => {
                          const customer = customerMap.get(portNum);
                          return (
                            <React.Fragment key={`port-${splitter.id}-${portNum}`}>
                              <ListItem sx={{ py: 1.5 }}>
                                <ListItemIcon sx={{ minWidth: 50, textAlign: 'center' }}>
                                  <Typography variant="overline" color="text.secondary">Port {portNum}</Typography>
                                </ListItemIcon>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                  {getDeviceIcon(customer?.device_type)}
                                </ListItemIcon>
                                {customer ? (
                                  <ListItemText
                                    primary={customer.address}
                                    secondary={
                                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}> {/* Allow wrapping */}
                                        <Typography component="span" variant="caption">
                                          Device: {customer.device_type || 'Unknown'}
                                        </Typography>
                                        {getStatusChip(customer.status)}
                                      </Box>
                                    }
                                  />
                                ) : (
                                  <ListItemText primary="Empty" sx={{ fontStyle: 'italic', color: 'text.disabled' }} />
                                )}
                              </ListItem>
                              {portNum < capacity && <Divider component="li" variant="inset" />} {/* Inset divider */}
                            </React.Fragment>
                          );
                        })}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </AccordionDetails>
          </Accordion>
        </Paper> // End Paper wrap for FDH
      ))}
    </Box>
  );
};