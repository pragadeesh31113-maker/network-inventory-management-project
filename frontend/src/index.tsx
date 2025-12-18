// // frontend/src/index.tsx
// import 'reactflow/dist/style.css';
// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import App from './App';
// import { BrowserRouter } from 'react-router-dom';
// import { AuthProvider } from './contexts/AuthContext';
// import { CssBaseline, ThemeProvider } from '@mui/material';
// import { executiveDarkTheme } from './theme'; // <-- Import our new theme

// const root = ReactDOM.createRoot(
//   document.getElementById('root') as HTMLElement
// );
// root.render(
//   <React.StrictMode>
//     <BrowserRouter>
//       {/* Provide the theme to the entire app */}
//       <ThemeProvider theme={executiveDarkTheme}>
//         <CssBaseline /> {/* This applies the dark background */}
//         <AuthProvider>
//           <App />
//         </AuthProvider>
//       </ThemeProvider>
//     </BrowserRouter>
//   </React.StrictMode>
// );
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppThemeProvider } from './contexts/ThemeContext'; // <-- 1. IMPORT
import 'reactflow/dist/style.css'; // Keep this for React Flow

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* 2. REMOVE old ThemeProvider, REPLACE with AppThemeProvider */}
      <AppThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AppThemeProvider>
      {/* 3. CssBaseline is now inside ThemeContext, so it's gone from here */}
    </BrowserRouter>
  </React.StrictMode>
);