// frontend/src/components/charts/AssetPieChart.tsx
import React, { useState } from 'react';
import { Box } from '@mui/material'; // Removed Typography
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any; // Keep for recharts compatibility
}

interface AssetPieChartProps {
  data: ChartData[];
  // colors prop removed - component handles its own colors
  onSliceClick?: (name: string) => void; // To trigger filtering in parent
  activeFilter?: string | null; // To highlight the filtered slice
}

// *** Internal COLORS constant with all necessary types ***
const COLORS: { [key: string]: string } = {
  // Status Colors
  AVAILABLE: '#00C49F', // Green
  ASSIGNED: '#0088FE', // Blue
  FAULTY: '#FFBB28',   // Yellow/Orange
  IN_REPAIR: '#FF8042', // Darker Orange
  RETIRED: '#B0B0B0',   // Gray
  // Type Colors
  ONT: '#8884D8',       // Purple
  ROUTER: '#82CA9D',     // Light Green
  SPLITTER: '#FF7F0E',  // Brighter Orange
  FDH: '#1F77B4',       // Deeper Blue
};
// ******************************************************

export const AssetPieChart: React.FC<AssetPieChartProps> = ({ data, onSliceClick, activeFilter }) => {
  const [activeIndex, setActiveIndex] = useState(-1); // State to track hovered slice index

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  return (
    // Box for positioning and sizing
    <Box sx={{ position: 'relative', width: '100%', height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%" // Center horizontally
            cy="50%" // Center vertically
            innerRadius={0}     // <-- ** Makes it a full pie **
            outerRadius={100}   // <-- Size of the pie
            fill="#8884d8"      // Default fill (mostly overridden by Cells)
            dataKey="value"     // The key in 'data' representing the slice size
            stroke="none"       // No border between slices initially
            onMouseEnter={onPieEnter} // Trigger hover effect start
            onMouseLeave={onPieLeave} // Trigger hover effect end
            onClick={(d: ChartData) => onSliceClick && onSliceClick(d.name)} // Call parent's filter function on click
          >
            {/* Map through data to create individual, colored slices */}
            {data.map((entry, index) => {
              // Get color from internal constant, fallback to gray
              const color = COLORS[entry.name] || '#A0A0A0';
              // Determine if this slice is hovered or actively filtered
              const isActive = activeIndex === index || activeFilter === entry.name;

              return (
                <Cell
                  key={`cell-${entry.name}`}
                  fill={color} // Apply the specific color
                  style={{
                    // --- Hover/Active Effects ---
                    transform: isActive ? 'scale(1.08)' : 'scale(1)', // "Rise" effect
                    filter: isActive ? `drop-shadow(0 0 10px ${color})` : 'none', // "Glow" effect
                    // -------------------------
                    outline: 'none', // <-- ** Removes border on click **
                    transformOrigin: 'center center', // Scale from the center
                    // Smooth transitions for effects
                    transition: 'transform 0.2s ease-out, filter 0.2s ease-out, opacity 0.2s ease-out',
                    // Dim slices that are not part of the active filter
                    opacity: activeFilter && activeFilter !== entry.name ? 0.3 : 1,
                    // Change cursor to pointer if clickable
                    cursor: onSliceClick ? 'pointer' : 'default',
                  }}
                />
              );
            })}
          </Pie>
          {/* Tooltip with custom dark theme styling */}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E1E1E', // Dark background
              border: '1px solid #333',     // Subtle border
              borderRadius: '8px',         // Rounded corners
            }}
            labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }} // White title text
            itemStyle={{ color: '#E0E0E0' }} // Light gray value text
            formatter={(value: number, name: string) => [`${value} assets`, name]} // Format tooltip content
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Central title removed as requested */}
    </Box>
  );
};

// Add this empty export if needed to satisfy '--isolatedModules'
export {};