import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { clearAllCarts } from '../utils/cartUtils';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await apiClient.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      if (!silent) {
        logout();
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
  };

  const logout = () => {
    clearAllCarts();
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const isClient = user?.role === 'client';
  const isArtisan = user?.role === 'artisan';
  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      fetchUser,
      isClient,
      isArtisan,
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

