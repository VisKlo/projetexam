/**
 * Validation des numéros de téléphone français uniquement
 * Format accepté : 10 chiffres commençant par 0
 */

/**
 * Nettoie le numéro de téléphone en ne gardant que les chiffres
 * @param {string} phone - Numéro de téléphone à nettoyer
 * @returns {string} - Numéro nettoyé (chiffres uniquement)
 */
export const cleanPhoneNumber = (phone) => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

/**
 * Valide un numéro de téléphone français
 * @param {string} phone - Numéro de téléphone à valider
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validatePhone = (phone) => {
  if (!phone || phone.trim() === '') {
    return { isValid: false, error: 'Le numéro de téléphone est requis.' };
  }

  const trimmedPhone = phone.trim();
  
  // Nettoyer le numéro pour compter les chiffres
  const digitsOnly = cleanPhoneNumber(trimmedPhone);
  
  // Vérifier le format avec caractères autorisés
  // Autorise : chiffres, -, espaces, parenthèses, points (pas de + pour le format international)
  const allowedCharsRegex = /^[0-9\-\s().]+$/;
  if (!allowedCharsRegex.test(trimmedPhone)) {
    return { isValid: false, error: 'Caractères non autorisés. Utilisez uniquement des chiffres, espaces, tirets et parenthèses.' };
  }

  // Format français : exactement 10 chiffres commençant par 0
  if (digitsOnly.length !== 10) {
    return { isValid: false, error: 'Le numéro doit contenir exactement 10 chiffres.' };
  }

  // Doit commencer par 0
  if (!digitsOnly.startsWith('0')) {
    return { isValid: false, error: 'Le numéro doit commencer par 0 (format français).' };
  }

  // Le deuxième chiffre doit être entre 1 et 9 (pas 00)
  if (digitsOnly[1] === '0') {
    return { isValid: false, error: 'Format invalide. Le numéro ne peut pas commencer par 00.' };
  }

  // Vérifier que le deuxième chiffre est valide (1-9)
  if (!/^0[1-9]\d{8}$/.test(digitsOnly)) {
    return { isValid: false, error: 'Format invalide. Utilisez un numéro français (ex: 0123456789).' };
  }

  return { isValid: true, error: '' };
};

/**
 * Valide un numéro de téléphone (version simple pour compatibilité)
 * @param {string} phone - Numéro de téléphone à valider
 * @returns {boolean} - true si valide, false sinon
 */
export const isValidPhone = (phone) => {
  return validatePhone(phone).isValid;
};

