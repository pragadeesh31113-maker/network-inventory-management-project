// frontend/src/components/InternalLayout.tsx
import React, { ReactNode } from 'react';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, AppBar, Typography, CssBaseline } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Icons (same as before)
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import LogoutIcon from '@mui/icons-material/Logout';

const drawerWidth = 240;

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', roles: ['ADMIN', 'PLANNER'] },
  { text: 'Onboarding', icon: <AssignmentIndIcon />, path: '/onboarding', roles: ['PLANNER'] },
  { text: 'My Tasks', icon: <EngineeringIcon />, path: '/tasks', roles: ['TECHNICIAN'] },
  { text: 'Customer Support', icon: <SupportAgentIcon />, path: '/support', roles: ['SUPPORT'] },
  { text: 'Inventory', icon: <InventoryIcon />, path: '/inventory', roles: ['ADMIN', 'PLANNER'] },
  { text: 'Network Map', icon: <AccountTreeIcon />, path: '/network', roles: ['ADMIN', 'PLANNER'] },
];

export const InternalLayout = ({ children }: { children: ReactNode }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allowedNavItems = navItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ width: `calc(100% - ${drawerWidth}px)`, ml: `${drawerWidth}px` }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            Network Inventory Management
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {allowedNavItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path} // <-- This highlights the active page
                  onClick={() => navigate(item.path)}
                  sx={{
                    // --- This is the new style for the selected item ---
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(63, 81, 181, 0.15)', // Faded blue
                      borderRight: '3px solid',
                      borderColor: 'primary.main',
                      fontWeight: 'bold',
                    },
                    '&:hover': {
                       backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <ListItem disablePadding sx={{ position: 'absolute', bottom: 0, width: '100%' }}>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        </Box>
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
      >
        <Toolbar /> 
        {children} 
      </Box>
    </Box>
  );
};