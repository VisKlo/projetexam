const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Mapping simplifié des types de notifications vers les pages
const getNotificationRedirect = (type, role, relatedId) => {
  const redirects = {
    'new_message': '/messages',
    'new_conversation': '/messages',
    'order_status_changed': '/orders',
    'payment_validated': role === 'artisan' ? '/artisan' : '/orders',
    'order_preparing': role === 'artisan' ? '/artisan' : '/orders',
    'order_shipped': '/orders',
    'order_delivered': '/orders',
    'paid': '/orders',
    'new_order': '/admin',
    'new_review': relatedId ? `/products/${relatedId}` : '/products',
    'review_reply': relatedId ? `/products/${relatedId}` : '/products'
  };

  return redirects[type] || (role === 'admin' ? '/admin' : role === 'artisan' ? '/artisan' : '/orders');
};

router.get('/', async (req, res) => {
  try {
    const { unread } = req.query;

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];

    if (unread === 'true') {
      query += ' AND is_read = FALSE';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [notifications] = await pool.execute(query, params);

    // Enrichir les notifications avec les informations de redirection
    for (const notification of notifications) {
      // Pour les avis, récupérer le product_id si nécessaire
      let productId = notification.related_id;
      if ((notification.type === 'new_review' || notification.type === 'review_reply') && notification.related_id) {
        const [reviewInfo] = await pool.execute(
          'SELECT product_id FROM reviews WHERE id = ?',
          [notification.related_id]
        );
        if (reviewInfo.length > 0) {
          productId = reviewInfo[0].product_id;
        }
      }

      notification.redirect_to = getNotificationRedirect(notification.type, req.user.role, productId);
    }

    res.json({ notifications });
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
});

router.get('/count', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ count: result[0].count });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors du comptage des notifications' });
  }
});

router.get('/count-by-type', async (req, res) => {
  try {
    const [result] = await pool.execute(
      `SELECT 
        SUM(CASE WHEN type IN ('new_message', 'new_conversation') THEN 1 ELSE 0 END) as messages_count,
        SUM(CASE WHEN type NOT IN ('new_message', 'new_conversation') THEN 1 ELSE 0 END) as other_count
      FROM notifications 
      WHERE user_id = ? AND is_read = FALSE`,
      [req.user.id]
    );

    res.json({ 
      messages: result[0].messages_count || 0,
      other: result[0].other_count || 0
    });
  } catch (error) {
    console.error('Erreur comptage notifications par type:', error);
    res.status(500).json({ error: 'Erreur lors du comptage des notifications' });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;

    const [notifications] = await pool.execute(
      'SELECT id FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (notifications.length === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }

    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE id = ?',
      [id]
    );

    res.json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la notification' });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
      [req.user.id]
    );

    res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour des notifications' });
  }
});

router.put('/read-by-type', [
  body('types').isArray().withMessage('Les types doivent être un tableau'),
  body('types.*').isString().withMessage('Chaque type doit être une chaîne de caractères'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors.array()
      });
    }

    const { types } = req.body;

    if (!types || types.length === 0) {
      return res.status(400).json({ error: 'Au moins un type doit être fourni' });
    }

    const placeholders = types.map(() => '?').join(',');
    await pool.execute(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND type IN (${placeholders}) AND is_read = FALSE`,
      [req.user.id, ...types]
    );

    res.json({ message: 'Notifications marquées comme lues' });
  } catch (error) {
    console.error('Erreur marquage notifications par type:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour des notifications' });
  }
});

module.exports = router;

