// frontend/src/components/StatCard.tsx
import React from 'react';
import { Paper, Typography, Box } from '@mui/material';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color: string; // e.g., 'primary.main', 'success.main'
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  return (
    <Paper sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          bgcolor: color,
          color: 'common.white',
          // A subtle glow from the icon
          boxShadow: `0 0 15px ${color}`,
        }}
      >
        {React.cloneElement(icon, { sx: { fontSize: 28 } })}
      </Box>
      <Box>
        <Typography variant="h4" component="p" fontWeight="bold">
          {value}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {title}
        </Typography>
      </Box>
    </Paper>
  );
};