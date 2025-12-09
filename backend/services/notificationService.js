const pool = require('../config/database');

const createNotification = async (userId, type, title, message, relatedId = null) => {
  try {
    await pool.execute(
      'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?)',
      [userId, type, title, message, relatedId]
    );
  } catch (error) {
    throw error;
  }
};

const notifyArtisansForOrder = async (orderId) => {
  try {
    const [artisans] = await pool.execute(
      `SELECT DISTINCT a.user_id, a.business_name, o.id as order_id, o.total, o.order_number
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       JOIN artisans a ON p.artisan_id = a.id
       WHERE o.id = ?`,
      [orderId]
    );

    for (const artisan of artisans) {
      await createNotification(
        artisan.user_id,
        'payment_validated',
        'Paiement validé - Nouvelle commande',
        `Le paiement de la commande #${artisan.order_number || orderId} a été validé. Vous pouvez maintenant préparer et expédier le colis.`,
        orderId
      );
    }

    return artisans.length;
  } catch (error) {
    throw error;
  }
};

const notifyArtisansForPreparing = async (orderId) => {
  try {
    const [artisans] = await pool.execute(
      `SELECT DISTINCT a.user_id, a.business_name, o.order_number
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       JOIN artisans a ON p.artisan_id = a.id
       WHERE o.id = ?`,
      [orderId]
    );

    for (const artisan of artisans) {
      await createNotification(
        artisan.user_id,
        'order_preparing',
        'Commande prête à expédier',
        `La commande #${artisan.order_number || orderId} est en préparation. Vous pouvez maintenant l'expédier.`,
        orderId
      );
    }

    return artisans.length;
  } catch (error) {
    throw error;
  }
};

const notifyClientOrderStatus = async (orderId, status) => {
  try {
    const [orders] = await pool.execute(
      'SELECT user_id, order_number, status FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      console.error(`Commande ${orderId} non trouvée pour notification`);
      return;
    }

    const order = orders[0];
    const statusMessages = {
      'paid': 'Votre paiement a été validé. Votre commande est en cours de préparation.',
      'preparing': 'Votre commande est en cours de préparation.',
      'shipped': 'Votre commande a été expédiée.',
      'delivered': 'Votre commande a été livrée. N\'oubliez pas de laisser un avis !',
      'cancelled': 'Votre commande a été annulée.'
    };

    const message = statusMessages[status] || 'Le statut de votre commande a été mis à jour.';

    console.log(`Envoi notification à l'utilisateur ${order.user_id} pour commande ${orderId}, statut: ${status}`);
    
    await createNotification(
      order.user_id,
      'order_status_changed',
      `Commande #${order.order_number || orderId} - ${status}`,
      message,
      orderId
    );
    
    console.log(`Notification envoyée avec succès à l'utilisateur ${order.user_id} pour commande ${orderId}`);
  } catch (error) {
    console.error(`Erreur lors de l'envoi de la notification pour commande ${orderId}, statut ${status}:`, error);
    throw error;
  }
};

const notifyAdminsForNewOrder = async (orderId) => {
  try {
    // Récupérer tous les admins
    const [admins] = await pool.execute(
      'SELECT id FROM users WHERE role = ?',
      ['admin']
    );

    // Récupérer les informations de la commande
    const [orders] = await pool.execute(
      'SELECT order_number, total FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) return;

    const order = orders[0];

    // Notifier chaque admin
    for (const admin of admins) {
      await createNotification(
        admin.id,
        'new_order',
        'Nouvelle commande',
        `Une nouvelle commande #${order.order_number || orderId} d'un montant de ${parseFloat(order.total || 0).toFixed(2)}€ a été passée.`,
        orderId
      );
    }

    return admins.length;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  createNotification,
  notifyArtisansForOrder,
  notifyArtisansForPreparing,
  notifyClientOrderStatus,
  notifyAdminsForNewOrder
};

