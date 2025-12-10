// Client API avec intercepteurs et gestion d'erreurs centralisée
import axios from 'axios';
import { API_URL } from '../config';

// Créer une instance axios avec configuration de base
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter automatiquement le token d'authentification
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs de réponse
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si erreur 401 (non autorisé ou token expiré), nettoyer et rediriger
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // Ne pas rediriger si on est déjà sur la page de login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extrait le message d'erreur d'une réponse API
 */
export const getErrorMessage = (error, defaultMessage = 'Une erreur est survenue') => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.response?.data?.details) {
    if (Array.isArray(error.response.data.details)) {
      return error.response.data.details
        .map(err => `${err.field || 'Champ'}: ${err.message}`)
        .join('\n');
    }
    return error.response.data.details;
  }
  return error.message || defaultMessage;
};

export default apiClient;

