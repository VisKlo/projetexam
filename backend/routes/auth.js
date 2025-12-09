const express = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const AuthController = require('../controllers/authController');
const pool = require('../config/database');

const router = express.Router();
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty(),
], AuthController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], AuthController.login);

router.get('/me', authenticate, AuthController.getMe);

router.put('/me', authenticate, [
  body('first_name').optional().trim().notEmpty().withMessage('Le prénom est requis'),
  body('last_name').optional().trim().notEmpty().withMessage('Le nom est requis'),
  body('phone').optional().trim(),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
  body('address').optional().trim(),
], async (req, res) => {
  try {
    const { validationResult } = require('express-validator');
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors.array().map(err => ({ field: err.param, message: err.msg }))
      });
    }

    const { first_name, last_name, phone, email, address } = req.body;
    const updates = [];
    const params = [];

    if (first_name !== undefined) {
      updates.push('first_name = ?');
      params.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push('last_name = ?');
      params.push(last_name);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      params.push(phone && phone.trim() !== '' ? phone.trim() : null);
    }
    if (address !== undefined) {
      updates.push('address = ?');
      params.push(address || null);
    }
    if (email !== undefined) {
      const [existingUsers] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.user.id]
      );
      if (existingUsers.length > 0) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }
      updates.push('email = ?');
      params.push(email);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification à apporter' });
    }

    params.push(req.user.id);
    await pool.execute(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedUsers] = await pool.execute(
      'SELECT id, email, role, first_name, last_name, phone, address FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      message: 'Profil mis à jour avec succès',
      user: updatedUsers[0]
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
});

module.exports = router;
