const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const API_URL = apiUrl.replace(/\/+$/, '');

export const BACKEND_URL = API_URL.replace(/\/api$/, '');

/**
 * Construit l'URL complète d'une image ou vidéo depuis le backend
 * @param {string} imageUrl - URL relative ou absolue de l'image/vidéo
 * @returns {string|null} URL complète ou null si imageUrl est vide
 */
export const getImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  const baseUrl = BACKEND_URL || 'http://localhost:5000';
  return `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
};

const stripeKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
export const STRIPE_PUBLISHABLE_KEY = stripeKey.trim();

