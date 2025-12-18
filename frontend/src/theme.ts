// frontend/src/theme.ts
import { createTheme, alpha } from '@mui/material/styles';

// Your "Data-Centric" Palette
const darkPalette = {
  caribbeanCurrent: '#006466',
  midnightGreen: '#065a60',
  midnightGreen2: '#0b525b',
  midnightGreen3: '#144552',
  charcoal: '#1b3a4b',
  prussianBlue: '#212f45',
  spaceCadet: '#272640',
  darkPurple: '#312244',
  darkPurple2: '#3e1f47',
  palatinate: '#4d194d',
};

// Accents requested by user
const ACCENT_ORANGE = '#FF9800'; // A strong, clear orange
const ACCENT_YELLOW = '#FFC107'; // A bright, data-vis yellow

// --- 1. DARK THEME (Your new "Monotone" theme) ---
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: ACCENT_ORANGE, // Primary actions are orange
    },
    secondary: {
      main: ACCENT_YELLOW, // Secondary accents are yellow
    },
    background: {
      default: '#000000',     // Pure black background for max contrast
      paper: '#121212',       // Very dark gray for "cards" (monotone)
    },
    text: {
      primary: '#FFFFFF',     // Pure white text for sharpness
      secondary: '#B0B0B0',   // Lighter gray for secondary text
    },
    divider: alpha('#FFFFFF', 0.12), // Faint white divider
  },
  // --- SHARP CORNERS & TYPOGRAPHY ---
  shape: {
    borderRadius: 0, // No border radius
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    button: {
      textTransform: 'none', // Professional, non-uppercase buttons
      fontWeight: 600,
    }
  },
  // --- COMPONENT OVERRIDES (The "Sharp" Look) ---
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0, // No shadows
        variant: "outlined", // Use sharp borders
      },
      styleOverrides: {
        root: {
          borderRadius: 0, // Ensure no radius
          borderColor: alpha('#FFFFFF', 0.12), // Faint border
        },
      }
    },
    MuiCard: {
      defaultProps: {
        elevation: 0, // No shadows
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      }
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: '#000000', // Match the black background
          borderBottom: `1px solid ${alpha('#FFFFFF', 0.12)}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#000000', // Match the black background
          borderRight: `1px solid ${alpha('#FFFFFF', 0.12)}`,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0, // No radius
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0, // No radius
        },
      },
    },
  },
});

// --- 2. LIGHT THEME (A clean, sharp light equivalent) ---
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976D2', // Standard Material blue
    },
    secondary: {
      main: '#D32F2F', // Standard Material red
    },
    background: {
      default: '#F4F6F8', // Very light gray
      paper: '#FFFFFF',   // Pure white
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
  // --- SHARP CORNERS & TYPOGRAPHY ---
  shape: {
    borderRadius: 0, // No border radius
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    }
  },
  // --- COMPONENT OVERRIDES (The "Sharp" Look) ---
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 0,
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      }
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      }
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: 'rgba(0, 0, 0, 0.87)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
  },
});