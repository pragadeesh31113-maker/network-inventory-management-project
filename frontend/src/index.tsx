// frontend/src/index.tsx
import 'reactflow/dist/style.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { executiveDarkTheme } from './theme'; // <-- Import our new theme

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Provide the theme to the entire app */}
      <ThemeProvider theme={executiveDarkTheme}>
        <CssBaseline /> {/* This applies the dark background */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);