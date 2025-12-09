const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

router.use(authenticate);

/**
 * Récupère toutes les conversations de l'utilisateur connecté
 * Exclut les conversations supprimées (soft delete)
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Créer la table conversation_deletions si elle n'existe pas
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS conversation_deletions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          conversation_id INT NOT NULL,
          user_id INT NOT NULL,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_conversation (conversation_id, user_id),
          INDEX idx_user (user_id),
          INDEX idx_conversation (conversation_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (error) {
      // Table existe déjà, continuer
    }

    let query = `
      SELECT 
        c.*,
        CASE 
          WHEN c.client_id = ? THEN u2.first_name
          ELSE u1.first_name
        END as other_user_first_name,
        CASE 
          WHEN c.client_id = ? THEN u2.last_name
          ELSE u1.last_name
        END as other_user_last_name,
        CASE 
          WHEN c.client_id = ? THEN u2.email
          ELSE u1.email
        END as other_user_email,
        p.name as product_name,
        p.image_url as product_image,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = FALSE) as unread_count,
        (SELECT m.message FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM conversations c
      LEFT JOIN users u1 ON c.client_id = u1.id
      LEFT JOIN users u2 ON c.artisan_id = u2.id
      LEFT JOIN products p ON c.product_id = p.id
      LEFT JOIN conversation_deletions cd ON c.id = cd.conversation_id AND cd.user_id = ?
      WHERE (c.client_id = ? OR c.artisan_id = ?)
      AND cd.id IS NULL
      ORDER BY c.last_message_at DESC
    `;

    const [conversations] = await pool.execute(query, [userId, userId, userId, userId, userId, userId, userId]);

    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des conversations' });
  }
});

// Créer ou récupérer une conversation
router.post('/conversations', [
  body('artisan_id').optional().isInt().withMessage('L\'ID de l\'artisan doit être un nombre'),
  body('client_id').optional().isInt().withMessage('L\'ID du client doit être un nombre'),
  body('product_id').optional().isInt().withMessage('L\'ID du produit doit être un nombre'),
  body('order_id').optional().isInt().withMessage('L\'ID de la commande doit être un nombre'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors.array()
      });
    }

    const { artisan_id, client_id, product_id, order_id } = req.body;
    let finalClientId, finalArtisanId;

    if (req.user.role === 'client') {
      if (!artisan_id) {
        return res.status(400).json({ error: 'L\'ID de l\'artisan est requis pour les clients' });
      }
      finalClientId = req.user.id;
      finalArtisanId = artisan_id;

      const [artisans] = await pool.execute(
        'SELECT u.id FROM users u JOIN artisans a ON u.id = a.user_id WHERE u.id = ? AND u.role = "artisan"',
        [artisan_id]
      );

      if (artisans.length === 0) {
        return res.status(404).json({ error: 'Artisan non trouvé' });
      }
    } else if (req.user.role === 'artisan') {
      if (!client_id) {
        return res.status(400).json({ error: 'L\'ID du client est requis pour les artisans' });
      }
      finalClientId = client_id;
      finalArtisanId = req.user.id;

      const [clients] = await pool.execute(
        'SELECT id FROM users WHERE id = ? AND role = "client"',
        [client_id]
      );

      if (clients.length === 0) {
        return res.status(404).json({ error: 'Client non trouvé' });
      }
    } else {
      return res.status(403).json({ error: 'Seuls les clients et les artisans peuvent créer des conversations' });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM conversations WHERE client_id = ? AND artisan_id = ? ORDER BY last_message_at DESC LIMIT 1',
      [finalClientId, finalArtisanId]
    );

    let conversationId;
    if (existing.length > 0) {
      conversationId = existing[0].id;
      
      if (product_id) {
        await pool.execute(
          'UPDATE conversations SET product_id = ? WHERE id = ?',
          [product_id, conversationId]
        );
      }
    } else {
      const [result] = await pool.execute(
        'INSERT INTO conversations (client_id, artisan_id, product_id, order_id) VALUES (?, ?, ?, ?)',
        [finalClientId, finalArtisanId, product_id || null, order_id || null]
      );
      conversationId = result.insertId;

      const recipientId = req.user.role === 'client' ? finalArtisanId : finalClientId;
      await createNotification(
        recipientId,
        'new_message',
        'Nouvelle conversation',
        `Une nouvelle conversation a été démarrée.`,
        conversationId
      );
    }

    const [conversations] = await pool.execute(
      `SELECT 
        c.*,
        u1.first_name as client_first_name,
        u1.last_name as client_last_name,
        u2.first_name as artisan_first_name,
        u2.last_name as artisan_last_name,
        p.name as product_name
      FROM conversations c
      JOIN users u1 ON c.client_id = u1.id
      JOIN users u2 ON c.artisan_id = u2.id
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.id = ?`,
      [conversationId]
    );

    res.json({ conversation: conversations[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
  }
});

/**
 * Récupère tous les messages d'une conversation
 * Marque automatiquement les messages comme lus et les notifications associées
 */
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur fait partie de la conversation
    const [conversations] = await pool.execute(
      'SELECT id FROM conversations WHERE id = ? AND (client_id = ? OR artisan_id = ?)',
      [id, userId, userId]
    );

    if (conversations.length === 0) {
      return res.status(403).json({ error: 'Accès refusé à cette conversation' });
    }

    await pool.execute(
      'UPDATE messages SET is_read = TRUE WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE',
      [id, userId]
    );

    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND type = ? AND related_id = ? AND is_read = FALSE',
      [userId, 'new_message', id]
    );

    const [messages] = await pool.execute(
      `SELECT 
        m.*,
        u.first_name,
        u.last_name,
        u.role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at ASC`,
      [id]
    );

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
  }
});

/**
 * Envoie un nouveau message dans une conversation
 * Empêche l'envoi de messages aux conversations système
 */
router.post('/conversations/:id/messages', [
  body('message').trim().notEmpty().withMessage('Le message ne peut pas être vide'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { message } = req.body;
    const senderId = req.user.id;

    const [conversations] = await pool.execute(
      'SELECT client_id, artisan_id FROM conversations WHERE id = ?',
      [id]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    const conversation = conversations[0];
    if (conversation.client_id !== senderId && conversation.artisan_id !== senderId) {
      return res.status(403).json({ error: 'Accès refusé à cette conversation' });
    }

    const [systemUser] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      ['system@site.com']
    );
    
    if (systemUser.length > 0 && conversation.artisan_id === systemUser[0].id) {
      return res.status(403).json({ error: 'Vous ne pouvez pas envoyer de messages au système automatique' });
    }

    const [result] = await pool.execute(
      'INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)',
      [id, senderId, message]
    );

    await pool.execute(
      'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
      [id]
    );

    const recipientId = conversation.client_id === senderId 
      ? conversation.artisan_id 
      : conversation.client_id;

    const [senderInfo] = await pool.execute(
      'SELECT first_name, last_name FROM users WHERE id = ?',
      [senderId]
    );

    const senderName = senderInfo.length > 0 
      ? `${senderInfo[0].first_name} ${senderInfo[0].last_name}`
      : 'Quelqu\'un';

    await createNotification(
      recipientId,
      'new_message',
      'Nouveau message',
      `${senderName} vous a envoyé un message${message.length > 50 ? ': ' + message.substring(0, 50) + '...' : ': ' + message}`,
      id
    );

    const [messages] = await pool.execute(
      `SELECT 
        m.*,
        u.first_name,
        u.last_name,
        u.role
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ message: messages[0] });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
  }
});

/**
 * Compte le nombre de messages non lus de l'utilisateur
 */
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user.id;

    const [result] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM messages m
       JOIN conversations c ON m.conversation_id = c.id
       LEFT JOIN conversation_deletions cd ON c.id = cd.conversation_id AND cd.user_id = ?
       WHERE (c.client_id = ? OR c.artisan_id = ?) 
       AND m.sender_id != ? 
       AND m.is_read = FALSE
       AND cd.id IS NULL`,
      [userId, userId, userId, userId]
    );

    res.json({ count: result[0].count || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du comptage' });
  }
});

/**
 * Supprime une conversation (soft delete)
 * Si les deux participants suppriment la conversation, elle est supprimée définitivement
 */
router.delete('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Vérifier que l'utilisateur fait partie de la conversation
    const [conversations] = await pool.execute(
      'SELECT id, client_id, artisan_id FROM conversations WHERE id = ? AND (client_id = ? OR artisan_id = ?)',
      [id, userId, userId]
    );

    if (conversations.length === 0) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS conversation_deletions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          conversation_id INT NOT NULL,
          user_id INT NOT NULL,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY unique_user_conversation (conversation_id, user_id),
          INDEX idx_user (user_id),
          INDEX idx_conversation (conversation_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
    } catch (error) {
    }

    await pool.execute(
      'INSERT INTO conversation_deletions (conversation_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE deleted_at = CURRENT_TIMESTAMP',
      [id, userId]
    );

    const conversation = conversations[0];
    
    const [deletions] = await pool.execute(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM conversation_deletions 
       WHERE conversation_id = ? 
       AND user_id IN (?, ?)`,
      [id, conversation.client_id, conversation.artisan_id]
    );

    const deletionCount = deletions[0].count;

    if (deletionCount >= 2) {
      await pool.execute('DELETE FROM conversations WHERE id = ?', [id]);
    }

    res.json({ message: 'Conversation supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression conversation:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la conversation' });
  }
});

module.exports = router;
