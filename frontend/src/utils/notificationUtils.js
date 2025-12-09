/**
 * Utilitaires pour la gestion des notifications
 */

import axios from 'axios';
import { API_URL } from '../config';

/**
 * Marque les notifications comme lues par type
 * @param {string[]} types - Types de notifications à marquer comme lues
 * @returns {Promise<void>}
 */
export const markNotificationsAsRead = async (types) => {
  if (!types || types.length === 0) return;
  
  try {
    const token = localStorage.getItem('token');
    await axios.put(`${API_URL}/notifications/read-by-type`, {
      types
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error('Erreur marquage notifications:', error);
  }
};

/**
 * Types de notifications par page (sans chevauchement)
 * Chaque page ne marque que ses propres notifications pour éviter qu'elles disparaissent des autres pages
 * 
 * Note: Les notifications de commandes ont été remplacées par des messages automatiques
 */
export const NOTIFICATION_TYPES = {
  // Notifications de messages (uniquement pour la page Messages)
  MESSAGES: ['new_message', 'new_conversation'],
  
  // Les notifications de commandes ont été supprimées - remplacées par des messages automatiques
  // ORDERS: [] - désactivé
  
  // Notifications spécifiques aux admins (uniquement pour la page Admin)
  // Les admins voient les nouveaux avis (les nouvelles commandes sont maintenant des messages automatiques)
  ADMIN: ['new_review', 'review_reply'],
  
  // Les notifications de commandes pour les artisans ont été supprimées - remplacées par des messages automatiques
  // ARTISAN: [] - désactivé
};

/**
 * Marque les notifications comme lues pour une page spécifique
 * Chaque page ne marque que ses propres notifications pour éviter qu'elles disparaissent des autres pages
 * @param {string} page - Nom de la page ('messages', 'orders', 'admin', 'artisan')
 * @returns {Promise<void>}
 */
export const markPageNotificationsAsRead = async (page) => {
  const typesMap = {
    'messages': NOTIFICATION_TYPES.MESSAGES,
    'orders': NOTIFICATION_TYPES.ORDERS,
    'admin': NOTIFICATION_TYPES.ADMIN,
    'artisan': NOTIFICATION_TYPES.ARTISAN
  };
  
  const types = typesMap[page.toLowerCase()];
  if (types) {
    await markNotificationsAsRead(types);
  }
};

