import React, { createContext, useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { clearAllCarts } from '../utils/cartUtils';

export const AuthContext = createContext();

/**
 * Vérifie si un token JWT est expiré (sans vérifier la signature)
 * @param {string} token - Token JWT
 * @returns {boolean} - true si le token est expiré ou invalide
 */
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convertir en millisecondes
    const now = Date.now();
    
    // Le token est expiré s'il reste moins de 5 minutes avant expiration
    // ou s'il est déjà expiré
    return now >= (exp - 5 * 60 * 1000);
  } catch (error) {
    // Si le token est malformé, le considérer comme expiré
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('token');
    // Vérifier immédiatement si le token est expiré
    if (storedToken && isTokenExpired(storedToken)) {
      localStorage.removeItem('token');
      return null;
    }
    return storedToken;
  });

  const logout = () => {
    clearAllCarts();
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const fetchUser = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      
      // Vérifier l'expiration avant la requête
      const currentToken = localStorage.getItem('token');
      if (!currentToken || isTokenExpired(currentToken)) {
        logout();
        return;
      }
      
      const response = await apiClient.get('/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Erreur récupération utilisateur:', error);
      // Si c'est une erreur 401 (token expiré ou invalide), déconnecter
      if (error.response?.status === 401 || !silent) {
        logout();
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (token) {
      // Vérifier à nouveau avant de faire la requête
      if (isTokenExpired(token)) {
        logout();
        setLoading(false);
      } else {
        fetchUser();
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
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

