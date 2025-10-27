// frontend/src/components/network_map/FDHNode.tsx
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Paper } from '@mui/material';
import StorageIcon from '@mui/icons-material/Storage'; // For FDH

const FDHNode = ({ data }: { data: { label: string; details?: string; type?: string } }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: '#3F51B5', // Primary Blue
        color: 'white',
        textAlign: 'center',
        width: 180,
        minHeight: 80,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        border: '2px solid #283593',
        boxShadow: '0px 4px 15px rgba(0, 0, 0, 0.3)',
      }}
    >
      <StorageIcon sx={{ fontSize: 30, mb: 0.5 }} />
      <Typography variant="subtitle1" fontWeight="bold">{data.label}</Typography>
      {data.details && <Typography variant="caption" sx={{ opacity: 0.9 }}>{data.details}</Typography>}
      <Handle type="source" position={Position.Right} id="a" style={{ background: '#555', right: -5, width: 10, height: 10 }} />
    </Paper>
  );
};

export default memo(FDHNode);