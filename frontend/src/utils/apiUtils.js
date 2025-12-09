// Utilitaires pour les appels API

import { API_URL } from '../config';

/**
 * Nettoie l'URL de l'API (supprime le slash final si présent)
 */
export const getApiUrl = (endpoint = '') => {
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

