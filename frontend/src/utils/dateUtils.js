// Utilitaires pour le formatage des dates

/**
 * Formate une date relative (il y a X min/h/j)
 */
export const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (hours < 24) return `Il y a ${hours}h`;
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

/**
 * Formate une date pour les messages (heure si aujourd'hui, date complète sinon)
 */
export const formatMessageTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

/**
 * Formate une date au format français court (JJ/MM/AAAA)
 */
export const formatDateShort = (dateString) => {
  return new Date(dateString).toLocaleDateString('fr-FR');
};

/**
 * Formate une date au format français avec heure
 */
export const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('fr-FR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

