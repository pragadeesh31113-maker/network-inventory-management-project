// frontend/src/pages/AdminDashboard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { 
    Box, Typography, Grid, Paper, CircularProgress, Alert, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Button, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    FormControl, InputLabel, Select, Chip, SelectChangeEvent, Tooltip, AlertTitle
} from '@mui/material';
import { StatCard } from '../components/StatCard';
import { AssetPieChart } from '../components/charts/AssetPieChart';

// Icons
import PeopleIcon from '@mui/icons-material/People';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import MemoryIcon from '@mui/icons-material/Memory';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PersonOffIcon from '@mui/icons-material/PersonOff';

// --- Data Types ---

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

type UserRole = "ADMIN" | "PLANNER" | "TECHNICIAN" | "SUPPORT" | "CUSTOMER";

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
}

// Separate type for creation, as password is required
interface UserCreateForm {
  username: string;
  email: string;
  full_name?: string;
  password?: string;
  role: UserRole;
  is_active: boolean;
}

const emptyUser: UserCreateForm = {
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'TECHNICIAN',
    is_active: true,
};

// --- Main Component ---
export const AdminDashboard: React.FC = () => {
  // State for KPIs and Charts
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [assetData, setAssetData] = useState<ChartData[]>([]);
  const [taskData, setTaskData] = useState<ChartData[]>([]); // For the Task chart
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // State for User Management
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState('');
  
  // State for Dialog
  const [open, setOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User> | UserCreateForm>(emptyUser);
  const [dialogError, setDialogError] = useState('');

  // --- Data Fetching ---

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/dashboard/summary');
      setKpis(res.data.kpis);
      setAssetData(res.data.asset_summary);
      setTaskData(res.data.task_summary); // Set task data
    } catch (err) {
      setError('Failed to load dashboard summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      setUserError('');
      const res = await api.get<User[]>('/api/users/');
      setUsers(res.data);
    } catch (err) {
      setUserError('Failed to load users.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
  }, [fetchDashboardData, fetchUsers]);

  // --- User Management Handlers ---

  const handleOpenCreate = () => {
    setCurrentUser(emptyUser);
    setIsEditMode(false);
    setDialogError('');
    setOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setCurrentUser(user);
    setIsEditMode(true);
    setDialogError('');
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCurrentUser(emptyUser);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<any>) => {
    // --- THIS IS THE FIX ---
    // We only destructure 'name' and 'value', which exist on both event types.
    const { name, value } = e.target;
    // --- END FIX ---
    
    // Handle boolean conversion for 'is_active'
    let finalValue: string | boolean = value;
    if (name === 'is_active') {
        finalValue = value === 'true';
    }

    setCurrentUser(prev => ({
      ...prev,
      [name]: finalValue,
    }));
  };
  
  const handleSave = async () => {
    setDialogError('');
    try {
      if (isEditMode) {
        // We are editing
        const userToUpdate = currentUser as User;
        const updatePayload = {
            email: userToUpdate.email,
            full_name: userToUpdate.full_name,
            role: userToUpdate.role,
            is_active: userToUpdate.is_active
        };
        await api.put(`/api/users/${userToUpdate.id}`, updatePayload);
      } else {
        // We are creating
        const userToCreate = currentUser as UserCreateForm;
        if (!userToCreate.password || userToCreate.password.length < 6) {
            setDialogError('Password is required and must be at least 6 characters.');
            return;
        }
        await api.post('/api/users/', userToCreate);
      }
      fetchUsers(); // Refresh the user list
      handleClose(); // Close the dialog
    } catch (err: any) {
      setDialogError(err.response?.data?.detail || 'An error occurred.');
    }
  };
  
  const handleDelete = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.delete(`/api/users/${userId}`);
        fetchUsers(); // Refresh the list
      } catch (err: any) {
        setUserError(err.response?.data?.detail || 'Failed to delete user.');
      }
    }
  };

  // --- Helper Components for Table ---

  const RoleChip = ({ role }: { role: UserRole }) => {
    const icons: Record<UserRole, React.ReactElement> = {
      ADMIN: <AdminPanelSettingsIcon />,
      PLANNER: <EngineeringIcon />,
      TECHNICIAN: <EngineeringIcon />,
      SUPPORT: <SupportAgentIcon />,
      CUSTOMER: <PersonIcon />,
    };
    const colors: Record<UserRole, "primary" | "secondary" | "info" | "warning" | "success" | "default"> = {
        ADMIN: 'primary',
        PLANNER: 'info',
        TECHNICIAN: 'secondary',
        SUPPORT: 'warning',
        CUSTOMER: 'success'
    };
    return <Chip icon={icons[role]} label={role} color={colors[role] || 'default'} size="small" variant="outlined" />;
  };

  const StatusChip = ({ active }: { active: boolean }) => {
    return active ? (
      <Chip icon={<CheckCircleIcon />} label="Active" color="success" size="small" variant="outlined" />
    ) : (
      <Chip icon={<PersonOffIcon />} label="Inactive" color="default" size="small" variant="outlined" />
    );
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Admin Dashboard</Typography>
      
      {/* --- Section 1: KPIs --- */}
      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}
      {kpis && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Total Customers" value={kpis.total_customers} icon={<PeopleIcon />} color="primary.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Active Customers" value={kpis.active_customers} icon={<CheckCircleIcon />} color="success.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Pending Tasks" value={kpis.pending_tasks} icon={<PendingActionsIcon />} color="warning.main" />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard title="Available ONTs" value={kpis.available_onts} icon={<MemoryIcon />} color="info.main" />
          </Grid>
        </Grid>
      )}
      
      {/* --- Section 2: Charts --- */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>Asset Status</Typography>
            {loading ? <CircularProgress /> : <AssetPieChart data={assetData} />}
          </Paper>
        </Grid>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: 400 }}>
            <Typography variant="h6" gutterBottom>Task Status</Typography>
            {loading ? <CircularProgress /> : (
              <Box sx={{height: '100%', width: '100%', pt: 2}}>
                {/* We can use the AssetPieChart component for tasks too! */}
                <AssetPieChart data={taskData} />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* --- Section 3: User Management --- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">User Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
        >
          Add New User
        </Button>
      </Box>

      {userError && <Alert severity="error" onClose={() => setUserError('')}>{userError}</Alert>}
      
      <Paper>
        <TableContainer>
          {loadingUsers ? <CircularProgress sx={{m: 4}} /> : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Full Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow hover key={user.id}>
                    <TableCell sx={{ fontWeight: 'bold' }}>{user.username}</TableCell>
                    <TableCell>{user.full_name || '---'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><RoleChip role={user.role} /></TableCell>
                    <TableCell><StatusChip active={user.is_active} /></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => handleDelete(user.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      </Paper>

      {/* --- User Create/Edit Dialog --- */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditMode ? 'Edit User' : 'Create New User'}</DialogTitle>
        <DialogContent>
          {dialogError && <Alert severity="error" sx={{ mb: 2 }}>{dialogError}</Alert>}
          <TextField
            autoFocus
            margin="dense"
            name="username"
            label="Username"
            type="text"
            fullWidth
            value={currentUser.username || ''}
            onChange={handleChange}
            disabled={isEditMode}
            required={!isEditMode}
          />
          <TextField
            margin="dense"
            name="full_name"
            label="Full Name"
            type="text"
            fullWidth
            value={currentUser.full_name || ''}
            onChange={handleChange}
          />
          <TextField
            margin="dense"
            name="email"
            label="Email Address"
            type="email"
            fullWidth
            value={currentUser.email || ''}
            onChange={handleChange}
            required
          />
          <TextField
            margin="dense"
            name="password"
            label="Password"
            type="password"
            fullWidth
            onChange={handleChange}
            required={!isEditMode}
            disabled={isEditMode}
            helperText={isEditMode ? "Password cannot be changed here." : "Required for new user."}
          />
          <FormControl margin="dense" fullWidth required>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              name="role"
              value={currentUser.role || 'TECHNICIAN'}
              onChange={handleChange}
            >
              <MenuItem value="ADMIN">Admin</MenuItem>
              <MenuItem value="PLANNER">Planner</MenuItem>
              <MenuItem value="TECHNICIAN">Technician</MenuItem>
              <MenuItem value="SUPPORT">Support</MenuItem>
              <MenuItem value="CUSTOMER">Customer</MenuItem>
            </Select>
          </FormControl>
          <FormControl margin="dense" fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              label="Status"
              name="is_active"
              value={(currentUser as User).is_active === false ? 'false' : 'true'}
              onChange={handleChange}
            >
              <MenuItem value="true">Active</MenuItem>
              <MenuItem value="false">Inactive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {isEditMode ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};