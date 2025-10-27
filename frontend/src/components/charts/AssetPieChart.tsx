// frontend/src/components/charts/AssetPieChart.tsx
import React, { useState } from 'react';
import { Box } from '@mui/material'; // Removed Typography
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface AssetPieChartProps {
  data: ChartData[];
  // title prop is removed
  onSliceClick?: (name: string) => void;
  activeFilter?: string | null;
}

const COLORS: { [key: string]: string } = {

  AVAILABLE: '#00C49F', // Green

  ASSIGNED: '#0088FE', // Blue

  FAULTY: '#FF8042', // Orange

  IN_REPAIR: '#FFBB28', // Yellow

  RETIRED: '#B0B0B0', // Gray

  ONT: '#3F51B5',      // Blue

  ROUTER: '#00C49F',   // Green

  FDH:'#FF8042'

};

export const AssetPieChart: React.FC<AssetPieChartProps> = ({ data, onSliceClick, activeFilter }) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={0}     // <-- 1. This makes it a full pie
            outerRadius={100}   // <-- Adjusted size
            fill="#8884d8"
            dataKey="value"
            stroke="none"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            onClick={(d: ChartData) => onSliceClick && onSliceClick(d.name)}
          >
            {data.map((entry, index) => {
              const color = COLORS[entry.name] || '#A0A0A0';
              const isActive = activeIndex === index || activeFilter === entry.name;
              
              return (
                <Cell 
                  key={`cell-${entry.name}`} 
                  fill={color}
                  style={{
                    transform: isActive ? 'scale(1.08)' : 'scale(1)', // The "Rise"
                    filter: isActive ? `drop-shadow(0 0 10px ${color})` : 'none', // The "Glow"
                    outline: 'none', // <-- 2. This removes the "clumsy" border
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-out, filter 0.2s ease-out, opacity 0.2s ease-out',
                    opacity: activeFilter && activeFilter !== entry.name ? 0.3 : 1,
                    cursor: onSliceClick ? 'pointer' : 'default',
                  }}
                />
              );
            })}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1E1E1E',
              border: '1px solid #333',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
            itemStyle={{ color: '#E0E0E0' }}
            formatter={(value: number, name: string) => [`${value} assets`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* 3. The central title has been removed */}
    </Box>
  );
};