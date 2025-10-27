// frontend/src/components/network_map/SplitterNode.tsx
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Box, Typography, Paper } from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit'; // For Splitter

const SplitterNode = ({ data }: { data: { label: string; details?: string; type?: string } }) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 1,
        borderRadius: 2,
        bgcolor: '#00C49F', // Green for splitters
        color: 'black',
        textAlign: 'center',
        width: 160,
        minHeight: 70,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        border: '2px solid #00897b',
        boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
      }}
    >
      <CallSplitIcon sx={{ fontSize: 24, mb: 0.5 }} />
      <Typography variant="body1" fontWeight="bold">{data.label}</Typography>
      {data.details && <Typography variant="caption" sx={{ opacity: 0.9 }}>{data.details}</Typography>}
      <Handle type="target" position={Position.Left} id="a" style={{ background: '#555', left: -5, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Right} id="b" style={{ background: '#555', right: -5, width: 10, height: 10 }} />
    </Paper>
  );
};

export default memo(SplitterNode);