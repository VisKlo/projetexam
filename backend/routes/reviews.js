const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { createNotification } = require('../services/notificationService');

const router = express.Router();

router.get('/product/:product_id', async (req, res) => {
  try {
    const { product_id } = req.params;

    const [reviews] = await pool.execute(
      `SELECT 
        r.*, 
        u.first_name, 
        u.last_name,
        a.user_id as artisan_user_id,
        CONCAT(ua.first_name, ' ', ua.last_name) as artisan_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      JOIN artisans a ON p.artisan_id = a.id
      JOIN users ua ON a.user_id = ua.id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC`,
      [product_id]
    );
    
    for (const review of reviews) {
      review.artisan_reply = review.artisan_reply || null;
      review.artisan_reply_at = review.artisan_reply_at || null;
    }

    res.json({ reviews });
  } catch (error) {
    console.error('Erreur récupération avis:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des avis' });
  }
});

router.post('/', authenticate, authorize('client'), [
  body('product_id').isInt(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { product_id, rating, comment } = req.body;

    const [products] = await pool.execute(
      'SELECT id FROM products WHERE id = ? AND is_active = TRUE',
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const [purchases] = await pool.execute(
      `SELECT oi.id 
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.product_id = ? AND o.user_id = ? AND o.payment_status = 'paid'`,
      [product_id, req.user.id]
    );

    if (purchases.length === 0) {
      return res.status(403).json({ 
        error: 'Action non autorisée',
        details: 'Vous devez avoir acheté ce produit pour pouvoir laisser un avis'
      });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM reviews WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );

    if (existing.length > 0) {
      await pool.execute(
        'UPDATE reviews SET rating = ?, comment = ?, created_at = NOW() WHERE id = ?',
        [rating, comment || null, existing[0].id]
      );

      return res.json({ message: 'Avis mis à jour avec succès' });
    }

    const [result] = await pool.execute(
      'INSERT INTO reviews (user_id, product_id, rating, comment) VALUES (?, ?, ?, ?)',
      [req.user.id, product_id, rating, comment || null]
    );

    const [productInfo] = await pool.execute(
      `SELECT a.user_id, p.name 
       FROM products p
       JOIN artisans a ON p.artisan_id = a.id
       WHERE p.id = ?`,
      [product_id]
    );

    if (productInfo.length > 0) {
      await createNotification(
        productInfo[0].user_id,
        'new_review',
        'Nouvel avis reçu',
        `Un client a laissé un avis sur votre produit "${productInfo[0].name}".`,
        result.insertId
      );
    }

    res.status(201).json({
      message: 'Avis créé avec succès',
      review: { id: result.insertId, rating, comment }
    });
  } catch (error) {
    console.error('Erreur création avis:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'avis' });
  }
});

/**
 * Permet à un artisan de répondre à un avis sur l'un de ses produits
 */
router.post('/:id/reply', authenticate, authorize('artisan'), [
  body('reply').trim().notEmpty().withMessage('La réponse ne peut pas être vide'),
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
    const { reply } = req.body;

    const [reviews] = await pool.execute(
      `SELECT r.id, r.user_id, p.name as product_name
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       JOIN artisans a ON p.artisan_id = a.id
       WHERE r.id = ? AND a.user_id = ?`,
      [id, req.user.id]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ 
        error: 'Avis non trouvé',
        details: 'Cet avis n\'existe pas ou ne concerne pas vos produits'
      });
    }

    const review = reviews[0];

    await pool.execute(
      'UPDATE reviews SET artisan_reply = ?, artisan_reply_at = NOW() WHERE id = ?',
      [reply, id]
    );

    await createNotification(
      review.user_id,
      'review_reply',
      'Réponse à votre avis',
      `L'artisan a répondu à votre avis sur "${review.product_name}".`,
      id
    );

    res.json({ message: 'Réponse ajoutée avec succès' });
  } catch (error) {
    console.error('Erreur ajout réponse:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la réponse' });
  }
});

module.exports = router;
