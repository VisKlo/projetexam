const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');
// Rate limiting désactivé pour usage local uniquement
// const { paymentLimiter } = require('../middleware/rateLimiter');
const { sendOrderStatusMessageToClient, sendOrderMessageToArtisans } = require('../services/messageService');

const router = express.Router();

router.post('/create-intent', authenticate, authorize('client'), async (req, res) => {
  try {
    const { order_id, amount } = req.body;

    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [order_id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    const order = orders[0];

    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Cette commande a déjà été payée' });
    }

    if (Math.abs(order.total - amount) > 0.01) {
      return res.status(400).json({ error: 'Le montant ne correspond pas à la commande' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      metadata: {
        order_id: order_id.toString(),
        user_id: req.user.id.toString()
      }
    });

    const [paymentResult] = await pool.execute(
      'INSERT INTO payments (order_id, payment_intent_id, amount, status) VALUES (?, ?, ?, ?)',
      [order_id, paymentIntent.id, amount, 'pending']
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      payment_id: paymentResult.insertId
    });
  } catch (error) {
    console.error('Erreur création paiement:', error);
    res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
});

router.post('/confirm', authenticate, authorize('client'), async (req, res) => {
  try {
    const { payment_intent_id, order_id } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Le paiement n\'a pas été validé' });
    }

    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [order_id, req.user.id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Commande non trouvée' });
    }

    await pool.execute(
      'UPDATE payments SET status = ? WHERE payment_intent_id = ?',
      ['succeeded', payment_intent_id]
    );

    await pool.execute(
      'UPDATE orders SET payment_status = ?, status = ? WHERE id = ?',
      ['paid', 'paid', order_id]
    );

    // Envoyer des messages automatiques aux artisans et au client
    await sendOrderMessageToArtisans(order_id, 'new_order');
    await sendOrderStatusMessageToClient(order_id, 'paid');

    res.json({ message: 'Paiement confirmé avec succès' });
  } catch (error) {
    console.error('Erreur confirmation paiement:', error);
    res.status(500).json({ error: 'Erreur lors de la confirmation du paiement' });
  }
});

router.get('/status/:order_id', authenticate, async (req, res) => {
  try {
    const { order_id } = req.params;

    const [payments] = await pool.execute(
      'SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [order_id]
    );

    if (payments.length === 0) {
      return res.json({ payment: null });
    }

    res.json({ payment: payments[0] });
  } catch (error) {
    console.error('Erreur récupération statut paiement:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du statut' });
  }
});

module.exports = router;

