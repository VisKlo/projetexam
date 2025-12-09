const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Middleware d'authentification
 * Vérifie le token JWT dans le header Authorization et charge les informations de l'utilisateur
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant ou invalide' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [users] = await pool.execute(
      'SELECT id, email, role, first_name, last_name, is_active FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0 || !users[0].is_active) {
      return res.status(401).json({ error: 'Utilisateur non trouvé ou inactif' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    return res.status(401).json({ error: 'Token invalide' });
  }
};

/**
 * Middleware d'autorisation
 * Vérifie que l'utilisateur authentifié a l'un des rôles autorisés
 * @param {...string} roles - Rôles autorisés (ex: 'admin', 'artisan', 'client')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
};

module.exports = { authenticate, authorize };

