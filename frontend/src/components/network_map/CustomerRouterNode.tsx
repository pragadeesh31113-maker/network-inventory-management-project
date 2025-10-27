// frontend/src/components/network_map/CustomerRouterNode.tsx
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Paper } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi'; // For Router
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'; // For active status

const CustomerRouterNode = ({ data }: { data: { label: string; details?: string; deviceType?: string; status?: string } }) => {
  const isAvailable = data.status === 'AVAILABLE';
  const isAssigned = data.status === 'ASSIGNED';

  return (
    <Paper
      elevation={2}
      sx={{
        p: 1,
        borderRadius: 1,
        bgcolor: '#8884D8', // Purple for Router
        color: 'white',
        textAlign: 'center',
        width: 180,
        minHeight: 60,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        border: '1px solid #673ab7',
        boxShadow: '0px 2px 5px rgba(0, 0, 0, 0.15)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <WifiIcon sx={{ fontSize: 20 }} />
        <Typography variant="body2" fontWeight="bold">{data.label}</Typography>
      </Box>
      {data.details && <Typography variant="caption" sx={{ opacity: 0.9 }}>{data.details}</Typography>}
      {data.deviceType && <Typography variant="caption" sx={{ opacity: 0.8, fontStyle: 'italic' }}>{data.deviceType}</Typography>}

      {/* Status Indicator */}
      {data.status && (
        <FiberManualRecordIcon
          sx={{
            position: 'absolute',
            top: 5,
            right: 5,
            fontSize: 14,
            color: isAvailable ? 'green' : (isAssigned ? 'blue' : 'gray'),
            backgroundColor: 'white',
            borderRadius: '50%',
          }}
          titleAccess={`Status: ${data.status}`}
        />
      )}

      <Handle type="target" position={Position.Left} id="a" style={{ background: '#555', left: -5, width: 10, height: 10 }} />
    </Paper>
  );
};

export default memo(CustomerRouterNode);