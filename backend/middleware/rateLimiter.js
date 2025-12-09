const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
  skipSuccessfulRequests: true
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: 'Trop de tentatives de paiement, veuillez réessayer dans une minute.'
});

module.exports = { apiLimiter, authLimiter, paymentLimiter };

