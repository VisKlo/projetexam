// Utilitaires pour les chaînes de caractères

/**
 * Génère les initiales à partir d'un prénom et nom
 */
export const getInitials = (firstName, lastName) => {
  return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
};

/**
 * Tronque un texte à une longueur maximale
 */
export const truncate = (text, maxLength = 60) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

