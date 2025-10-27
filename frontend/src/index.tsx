// frontend/src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';

// A basic light theme
const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    {/* Provides URL routing */}
    <BrowserRouter>
      {/* Provides Material-UI styling */}
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* Normalizes browser styles */}
        
        {/* Provides our global login data */}
        <AuthProvider>
          <App />
        </AuthProvider>

      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);