import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/api';
import useIdleTimer from '../hooks/useIdleTimer';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role from GET /api/me on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await authAPI.me();
        setUser({ role: data.role });
      } catch (error) {
        // User is not authenticated
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Logout function
  const logout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      // Clear user state even if API call fails
      setUser(null);
    }
  };

  // Auto logout after 1 minute of inactivity
  useIdleTimer(() => {
    if (user) {
      logout();
    }
  }, 60000); // 60000ms = 1 minute

  // Login function to update user state after successful login
  const login = (role) => {
    setUser({ role });
  };

  const value = {
    user,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
