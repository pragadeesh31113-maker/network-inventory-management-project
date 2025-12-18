import React, { createContext, useState, useMemo, useContext, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme, darkTheme } from '../theme';

// Define the shape of the context
interface ThemeContextType {
  toggleTheme: () => void;
  mode: 'light' | 'dark';
}

// Create the context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Create the Provider component
export const AppThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get user's preference from localStorage, or default to 'dark'
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    try {
      const storedMode = localStorage.getItem('app-theme-mode');
      return (storedMode === 'light' || storedMode === 'dark') ? storedMode : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  // Function to toggle the theme
  const toggleTheme = () => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      localStorage.setItem('app-theme-mode', newMode); // Save choice
      return newMode;
    });
  };

  // Select the correct theme object based on the current mode
  const theme = useMemo(() => (mode === 'light' ? lightTheme : darkTheme), [mode]);

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline /> {/* This applies the background color and resets styles */}
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Create a custom hook to easily access the context
export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within an AppThemeProvider');
  }
  return context;
};