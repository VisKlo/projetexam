const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
const { sendOrderStatusMessageToClient, sendOrderMessageToArtisans } = require('../services/messageService');

const router = express.Router();

/**
 * Récupère toutes les commandes reçues par un artisan
 * Affiche uniquement les commandes contenant des produits de cet artisan
 */
router.get('/received', authenticate, authorize('artisan'), async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT o.*, u.first_name, u.last_name, u.email, u.id as client_id
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN artisans a ON p.artisan_id = a.id
      WHERE a.user_id = ?
      ORDER BY o.created_at DESC
    `;
    
    const [orders] = await pool.execute(query, [req.user.id]);

    for (const order of orders) {
      order.total = parseFloat(order.total) || 0;
      
      const [items] = await pool.execute(
        `SELECT oi.*, p.name as product_name, p.image_url, CONCAT(u.first_name, ' ', u.last_name) as artisan_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN artisans a ON p.artisan_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE oi.order_id = ? AND a.user_id = ?`,
        [order.id, req.user.id]
      );
      
      for (const item of items) {
        item.price = parseFloat(item.price) || 0;
        item.quantity = parseInt(item.quantity) || 0;
      }
      
      order.items = items;
    }

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes reçues' });
  }
});

router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT o.*, u.first_name, u.last_name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    query += ' AND o.user_id = ?';
    params.push(req.user.id);

    query += ' ORDER BY o.created_at DESC';

    const [orders] = await pool.execute(query, params);

    for (const order of orders) {
      order.total = parseFloat(order.total) || 0;
      
      const [items] = await pool.execute(
        `SELECT oi.*, p.name as product_name, p.image_url, CONCAT(u.first_name, ' ', u.last_name) as artisan_name, a.user_id as artisan_id
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN artisans a ON p.artisan_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE oi.order_id = ?`,
        [order.id]
      );
      
      for (const item of items) {
        item.price = parseFloat(item.price) || 0;
        item.quantity = parseInt(item.quantity) || 0;
      }
      
      order.items = items;
    }

    res.json({ orders });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await pool.execute(
      `SELECT o.*, u.first_name, u.last_name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const order = orders[0];

    order.total = parseFloat(order.total) || 0;

    if (req.user.role === 'client' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const [items] = await pool.execute(
      `SELECT oi.*, p.name as product_name, p.image_url, CONCAT(u.first_name, ' ', u.last_name) as artisan_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN artisans a ON p.artisan_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE oi.order_id = ?`,
      [id]
    );

    for (const item of items) {
      item.price = parseFloat(item.price) || 0;
      item.quantity = parseInt(item.quantity) || 0;
    }

    order.items = items;
    res.json({ order });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la commande' });
  }
});

router.post('/', authenticate, authorize('client'), [
  body('items').isArray({ min: 1 }).withMessage('La commande doit contenir au moins un article'),
  body('items.*.product_id').isInt().withMessage('L\'ID du produit doit être un nombre entier'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('La quantité doit être un nombre entier positif'),
  body('shipping_address').trim().notEmpty().withMessage('L\'adresse de livraison est requise'),
  body('shipping_phone').trim().notEmpty().withMessage('Le numéro de téléphone est requis'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Erreurs de validation',
        details: errors.array().map(err => ({ field: err.param, message: err.msg }))
      });
    }

    const [users] = await pool.execute(
      'SELECT phone FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const { items, shipping_address, shipping_phone } = req.body;

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(shipping_phone)) {
      return res.status(400).json({ 
        error: 'Format de téléphone invalide',
        details: 'Le numéro de téléphone doit contenir uniquement des chiffres, espaces, tirets et parenthèses'
      });
    }

    let total = 0;
    for (const item of items) {
      const [products] = await pool.execute(
        'SELECT price, stock FROM products WHERE id = ? AND is_active = TRUE',
        [item.product_id]
      );

      if (products.length === 0) {
        return res.status(400).json({ error: `Produit ${item.product_id} non trouvé ou inactif` });
      }

      if (products[0].stock < item.quantity) {
        return res.status(400).json({ 
          error: `Stock insuffisant pour le produit ${item.product_id}`,
          details: `Stock disponible: ${products[0].stock}, demandé: ${item.quantity}`
        });
      }

      total += parseFloat(products[0].price) * parseInt(item.quantity);
    }

    const shippingCost = 5.00;
    total += shippingCost;

    let orderResult;
    try {
      [orderResult] = await pool.execute(
        'INSERT INTO orders (user_id, status, payment_status, total, shipping_address, shipping_phone) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, 'pending', 'unpaid', total, shipping_address, shipping_phone]
      );
    } catch (dbError) {
      if (dbError.code === 'ER_BAD_FIELD_ERROR' && dbError.message.includes('shipping_phone')) {
        [orderResult] = await pool.execute(
          'INSERT INTO orders (user_id, status, payment_status, total, shipping_address) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, 'pending', 'unpaid', total, shipping_address]
        );
      } else {
        throw dbError;
      }
    }

    const orderId = orderResult.insertId;

    for (const item of items) {
      const [products] = await pool.execute(
        'SELECT name, price FROM products WHERE id = ?',
        [item.product_id]
      );

      await pool.execute(
        'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.product_id, products[0].name, item.quantity, products[0].price]
      );
    }

    res.status(201).json({
      message: 'Commande créée avec succès',
      order: {
        id: orderId,
        total,
        status: 'pending',
        payment_status: 'unpaid'
      }
    });
  } catch (error) {
    console.error('Erreur création commande:', error);
    console.error('Détails:', {
      code: error.code,
      message: error.message,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });
    
    let errorMessage = 'Erreur lors de la création de la commande';
    let errorDetails = undefined;

    if (error.code === 'ER_BAD_FIELD_ERROR') {
      errorMessage = 'Erreur de structure de base de données';
      errorDetails = 'La colonne shipping_phone n\'existe pas dans la table orders. Veuillez appliquer la migration: database/migration_add_shipping_phone.sql';
    } else if (error.code === 'ER_NO_DEFAULT_FOR_FIELD') {
      errorMessage = 'Champ requis manquant';
      errorDetails = error.sqlMessage || 'Un champ obligatoire n\'a pas été fourni';
    } else if (process.env.NODE_ENV === 'development') {
      errorDetails = error.message;
    }

    res.status(500).json({ 
      error: errorMessage,
      details: errorDetails
    });
  }
});

/**
 * Permet à un artisan de marquer une commande comme expédiée
 * Envoie automatiquement un message au client
 */
router.put('/:id/ship', authenticate, authorize('artisan', 'admin'), [
  body('tracking_number').optional().trim(),
], async (req, res) => {
  try {
    const { id } = req.params;
    const { tracking_number } = req.body;

    const [orders] = await pool.execute(
      `SELECT o.id, o.status, o.payment_status
       FROM orders o
       WHERE o.id = ? AND o.id IN (
         SELECT DISTINCT oi.order_id
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         JOIN artisans a ON p.artisan_id = a.id
         WHERE a.user_id = ?
       )`,
      [id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ 
        error: 'Commande non trouvée',
        details: 'Cette commande ne contient pas vos produits ou n\'existe pas'
      });
    }

    const order = orders[0];

    if (order.status !== 'preparing') {
      return res.status(400).json({ 
        error: 'Action non autorisée',
        details: 'Vous ne pouvez expédier que les commandes en statut "preparing"'
      });
    }

    const updates = ['status = ?'];
    const params = ['shipped'];

    if (tracking_number) {
      updates.push('tracking_number = ?');
      params.push(tracking_number);
    }

    params.push(id);

    await pool.execute(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Notifier le client
    await sendOrderStatusMessageToClient(id, 'shipped');

    res.json({ message: 'Commande marquée comme expédiée avec succès' });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du statut',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Permet à un admin de modifier le statut d'une commande
 * Envoie automatiquement des messages au client et aux artisans selon le nouveau statut
 */
router.put('/:id/status', authenticate, authorize('admin'), [
  body('status').isIn(['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled']),
  body('tracking_number').optional().trim(),
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
    const { status, tracking_number } = req.body;

    const [orders] = await pool.execute(
      'SELECT id, user_id, status, payment_status FROM orders WHERE id = ?',
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ 
        error: 'Commande non trouvée',
        details: `La commande avec l'ID ${id} n'existe pas`
      });
    }

    const order = orders[0];
    const oldStatus = order.status;

    if (oldStatus === status && !tracking_number) {
      return res.json({ message: 'Le statut de la commande est déjà à ce niveau' });
    }

    const updates = ['status = ?'];
    const params = [status];

    if (tracking_number) {
      updates.push('tracking_number = ?');
      params.push(tracking_number);
    }

    params.push(id);

    await pool.execute(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    if (oldStatus !== status) {
      try {
        if (status === 'paid' && order.payment_status !== 'paid') {
          await sendOrderMessageToArtisans(id, 'new_order');
        }

        if (status === 'preparing') {
          await sendOrderMessageToArtisans(id, 'preparing');
        }

        await sendOrderStatusMessageToClient(id, status);
      } catch (messageError) {
        console.error('Erreur lors de l\'envoi des messages automatiques:', messageError);
      }
    }

    res.json({ message: 'Statut de la commande mis à jour avec succès' });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erreur lors de la mise à jour du statut',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

