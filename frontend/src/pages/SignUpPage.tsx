// frontend/src/pages/SignUpPage.tsx
import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../api';
import { Box,Grid, TextField, Button, Typography, Container, Alert, Link } from '@mui/material';

export const SignUpPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState(''); // <-- Add pincode state
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const validatePincode = (code: string) => /^\d{6}$/.test(code); // Basic 6-digit check

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validatePincode(pincode)) {
      setError('Pincode must be 6 digits.');
      return;
    }
    try {
      await api.post('/api/auth/signup', {
        email,
        username,
        password,
        full_name: fullName,
        address,
        pincode // <-- Include pincode in payload
      });
      navigate('/login', { state: { message: 'Signup successful! Please log in.' } });
    } catch (err: any) {
      // --- **CORRECTED ERROR HANDLING** ---
      let errorMessage = 'Signup failed. Please try again.'; // Default
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMessage = detail; // It's a simple string, great
        } else if (Array.isArray(detail) && detail[0]?.msg) {
          errorMessage = detail[0].msg; // It's a FastAPI validation list, grab the first message
        } else if (typeof detail === 'object' && detail !== null && detail.msg) {
          errorMessage = detail.msg; // It's a single error object
        }
      }
      setError(errorMessage);
      // ------------------------------------
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Typography component="h1" variant="h5">
          Customer Sign Up
        </Typography>
        <Box component="form" onSubmit={handleSignUp} sx={{ mt: 3 }}>
          <Grid container spacing={2}>
            {/* --- Added Missing Fields --- */}
            <Grid item xs={12} sm={6}>
              <TextField
                autoComplete="given-name"
                name="fullName"
                required
                fullWidth
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoFocus
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                required
                fullWidth
                label="Username"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Email Address"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Service Address"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </Grid>
            {/* --- Pincode Field --- */}
            <Grid item xs={12}>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Pincode (6 digits)"
                name="pincode"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                inputProps={{ maxLength: 6 }} // Limit input length
                error={pincode !== '' && !validatePincode(pincode)} // Show error if invalid format
                helperText={pincode !== '' && !validatePincode(pincode) ? 'Pincode must be 6 digits' : ''}
              />
            </Grid>
            {/* --------------------- */}
          </Grid>

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
            Sign Up
          </Button>
          <Grid container justifyContent="flex-end">
            <Grid item>
              <Link component={RouterLink} to="/login" variant="body2">
                Already have an account? Sign in
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  );
};