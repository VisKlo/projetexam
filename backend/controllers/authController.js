const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const pool = require('../config/database');

class AuthController {
  static async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, first_name, last_name, phone, role } = req.body;

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Cet email est déjà utilisé' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const userId = await User.create({
        email,
        password: hashedPassword,
        first_name,
        last_name,
        phone,
        role
      });

      if (role === 'artisan') {
        await pool.execute(
          'INSERT INTO artisans (user_id, business_name, description, is_approved) VALUES (?, ?, ?, ?)',
          [userId, `${first_name} ${last_name}`, '', false]
        );
      }

      res.status(201).json({
        message: 'Compte créé avec succès',
        userId
      });
    } catch (error) {
      console.error('Erreur inscription:', error);
      res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
  }

  static async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await User.findByEmail(email);
      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      await User.updateLastLogin(user.id);

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Connexion réussie',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name
        }
      });
    } catch (error) {
      console.error('Erreur connexion:', error);
      res.status(500).json({ error: 'Erreur lors de la connexion' });
    }
  }

  static async getMe(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json({ user });
    } catch (error) {
      console.error('Erreur récupération profil:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
  }
}

module.exports = AuthController;

