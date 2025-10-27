// frontend/src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';

// Import Layouts
import { InternalLayout } from './components/InternalLayout';
// import { CustomerLayout } from './components/CustomerLayout'; 

// Import ALL Dashboards & Pages
import { AdminDashboard } from './pages/AdminDashboard';
import { PlannerDashboard } from './pages/PlannerDashboard';
import { TechnicianDashboard } from './pages/TechnicianDashboard';
import { SupportDashboard } from './pages/SupportDashboard';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { InventoryPage } from './pages/InventoryPage'; // <-- NEW
import { NetworkMapPage } from './pages/NetworkMapPage'; // <-- NEW
import { Box, CircularProgress } from '@mui/material';

// ProtectedRoute stays the same
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }
  return user ? children : <Navigate to="/login" replace />;
};

// This component wraps our pages in the correct layout
const AppLayout = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  // CUSTOMER gets a simple layout
  if (user.role === 'CUSTOMER') {
    return (
      // We'll wrap this in a <CustomerLayout> in Sprint 4
      <Routes>
        <Route path="/" element={<CustomerDashboard />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    );
  }

  // --- THIS IS THE FIXED ROUTER FOR STAFF ---
  // ALL OTHER STAFF get the InternalLayout
  return (
    <InternalLayout>
      <Routes>
        {/* Role-based home pages (the "/" route) */}
        {user.role === 'ADMIN' && <Route path="/" element={<AdminDashboard />} />}
        {user.role === 'PLANNER' && <Route path="/" element={<PlannerDashboard />} />}
        {user.role === 'TECHNICIAN' && <Route path="/" element={<TechnicianDashboard />} />}
        {user.role === 'SUPPORT' && <Route path="/" element={<SupportDashboard />} />}
        
        {/* Specific Pages from the Sidebar */}
        {/* The PlannerDashboard is ALSO the onboarding page */}
        <Route path="/onboarding" element={<PlannerDashboard />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/network" element={<NetworkMapPage />} />
        <Route path="/tasks" element={<TechnicianDashboard />} />
        <Route path="/support" element={<SupportDashboard />} />
        
        {/* Fallback to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </InternalLayout>
  );
};


function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <SignUpPage />} />
      
      {/* All protected routes are now handled by AppLayout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;