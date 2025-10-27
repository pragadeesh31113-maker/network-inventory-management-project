// frontend/src/pages/TechnicianDashboard.tsx
import React, { useState, useEffect } from 'react';
import api from '../api'; // <-- This will now be used
import { 
  Box, Typography, CircularProgress, Alert, 
  Card, CardContent, CardActions, Button, Chip, Grid 
} from '@mui/material';
import AssignmentIcon from '@mui/icons-material/Assignment';

interface Customer {
  id: number;
  address: string;
}
interface Task {
  id: number;
  status: string;
  notes: string | null;
  customer: Customer;
}

export const TechnicianDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // --- FIX: ADDED FULL FUNCTION IMPLEMENTATION ---
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/my-tasks');
      setTasks(res.data);
    } catch (err) {
      setError('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // --- FIX: ADDED FULL FUNCTION IMPLEMENTATION ---
  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    try {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      await api.put(`/tasks/${taskId}/status`, { status: newStatus });
      fetchTasks();
    } catch (err) {
      setError('Failed to update task status.');
      fetchTasks();
    }
  };

  const getStatusChip = (status: string) => {
    if (status === 'COMPLETED') return <Chip label="Completed" color="success" variant="outlined" />;
    if (status === 'IN_PROGRESS') return <Chip label="In Progress" color="info" />;
    if (status === 'FAILED') return <Chip label="Failed" color="error" />;
    return <Chip label="Pending" color="warning" />;
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>My Deployment Tasks</Typography>
      {tasks.length === 0 && (
        <Alert severity="info">You have no pending tasks.</Alert>
      )}
      <Grid container spacing={3}>
        {tasks.map((task) => (
          <Grid item xs={12} md={6} key={task.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  {getStatusChip(task.status)}
                  <AssignmentIcon color="action" />
                </Box>
                <Typography variant="h6" component="div">
                  {task.customer.address}
                </Typography>
                <Typography color="text.secondary">
                  Task ID: {task.id}
                </Typography>
              </CardContent>
              <CardActions sx={{p: 2, borderTop: '1px solid #333', background: '#191919'}}>
                {task.status === 'PENDING' && (
                  <Button 
                    fullWidth
                    variant="contained"
                    onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
                  >
                    Start Work
                  </Button>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                    <Button 
                      fullWidth
                      variant="contained" 
                      color="success"
                      onClick={() => handleUpdateStatus(task.id, 'COMPLETED')}
                    >
                      Mark Completed
                    </Button>
                    <Button 
                      fullWidth
                      variant="outlined" 
                      color="error"
                      onClick={() => handleUpdateStatus(task.id, 'FAILED')}
                    >
                      Mark Failed
                    </Button>
                  </Box>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};