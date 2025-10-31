// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api';

// 1. Define the shape of our User and Context
interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'PLANNER' | 'TECHNICIAN' | 'SUPPORT' | 'CUSTOMER';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// 2. Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Create the Provider (the component that "provides" the data)
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true); // Start as true

  // This effect runs when the 'token' state changes
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        // Token exists, let's validate it and get user data
        localStorage.setItem('access_token', token); // Make sure it's in storage
        try {
          const response = await api.get('/api/auth/me'); // Get user data
          setUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user, bad token.', error);
          // Token is invalid
          localStorage.removeItem('access_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false); // We're done loading (either success or fail)
    };
    
    fetchUser();
  }, [token]); // Re-run whenever the token changes

  const login = async (newToken: string) => {
    // This function is called by the LoginPage
    // It just sets the token, and the useEffect (above) does the rest.
    setToken(newToken);
  };

  const logout = () => {
    // Clear everything
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
  };

  // 4. Provide the values to all children
  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children} {/* Don't show the app until we've checked for a token */}
    </AuthContext.Provider>
  );
};

// 5. Create a "hook" to easily use the context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};