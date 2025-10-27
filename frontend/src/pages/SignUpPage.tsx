// frontend/src/pages/SignUpPage.tsx
import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import api from '../api';
import { Box, Button, Container, TextField, Typography, Link, Alert } from '@mui/material';

export const SignUpPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Simple password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    try {
      const payload = {
        username,
        email,
        full_name: fullName,
        address,
        password,
      };
      
      // Call the /api/auth/signup endpoint
      await api.post('/auth/signup', payload);
      
      setSuccess('Signup successful! Please log in.');
      // Redirect to login page after 2 seconds
      setTimeout(() => navigate('/login'), 2000);

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box sx={{ marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5">
          Customer Sign Up
        </Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <TextField
            margin="normal" required fullWidth
            label="Full Name"
            value={fullName} onChange={(e) => setFullName(e.target.value)}
          />
          <TextField
            margin="normal" required fullWidth
            label="Username"
            value={username} onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            margin="normal" required fullWidth
            label="Email Address" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            margin="normal" required fullWidth
            label="Full Address (for installation)"
            value={address} onChange={(e) => setAddress(e.target.value)}
          />
          <TextField
            margin="normal" required fullWidth
            label="Password (min 8 characters)" type="password"
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          
          {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ width: '100%', mt: 2 }}>{success}</Alert>}
          
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
            Sign Up
          </Button>
          <Link component={RouterLink} to="/login" variant="body2">
            {"Already have an account? Sign In"}
          </Link>
        </Box>
      </Box>
    </Container>
  );
};