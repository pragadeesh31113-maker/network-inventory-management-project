// frontend/src/theme.ts
import { createTheme } from '@mui/material/styles';

export const executiveDarkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3F51B5', // A strong, professional blue
    },
    secondary: {
      main: '#00C49F', // A "tech" accent green
    },
    background: {
      default: '#121212', // Deep charcoal
      paper: '#1E1E1E',   // Slightly lighter for cards/surfaces
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#B0B0B0',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
  },
  components: {
    // Style the main layout
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E1E1E',
          boxShadow: 'none',
          borderBottom: '1px solid #333',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1E1E1E',
          borderRight: '1px solid #333',
        },
      },
    },
    // Style all cards and paper surfaces
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          // Use 'outlined' for a clean, bordered look
          border: '1px solid #333',
        },
      },
      defaultProps: {
        elevation: 0, // No shadows, just borders
        variant: 'outlined',
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
        variant: 'outlined',
      },
    },
    // Style buttons
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none', // More professional
          fontWeight: 600,
        },
      },
      defaultProps: {
        variant: 'contained', // Default to solid buttons
      },
    },
  },
});