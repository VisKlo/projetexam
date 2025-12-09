const pool = require('../config/database');
const { createNotification } = require('./notificationService');

/**
 * Récupère ou crée un utilisateur système pour les messages automatiques
 */
const getSystemUserId = async () => {
  try {
    // Chercher un utilisateur système existant
    const [users] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      ['system@site.com']
    );

    if (users.length > 0) {
      return users[0].id;
    }

    // Créer un utilisateur système s'il n'existe pas
    const [result] = await pool.execute(
      `INSERT INTO users (email, password, role, first_name, last_name, is_active) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['system@site.com', '$2a$10$dummy', 'client', 'Système', 'Automatique', true]
    );

    return result.insertId;
  } catch (error) {
    console.error('Erreur lors de la récupération/création de l\'utilisateur système:', error);
    throw error;
  }
};

/**
 * Crée ou réutilise une conversation entre un client et un artisan
 */
const getOrCreateConversation = async (clientId, artisanId, orderId = null, productId = null) => {
  try {
    // Chercher une conversation existante
    const [existing] = await pool.execute(
      'SELECT id FROM conversations WHERE client_id = ? AND artisan_id = ? ORDER BY last_message_at DESC LIMIT 1',
      [clientId, artisanId]
    );

    if (existing.length > 0) {
      const conversationId = existing[0].id;
      
      // Mettre à jour order_id et product_id si fournis
      if (orderId || productId) {
        const updates = [];
        const params = [];
        
        if (orderId) {
          updates.push('order_id = ?');
          params.push(orderId);
        }
        if (productId) {
          updates.push('product_id = ?');
          params.push(productId);
        }
        
        params.push(conversationId);
        await pool.execute(
          `UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`,
          params
        );
      }
      
      return existing[0].id;
    }

    // Créer une nouvelle conversation
    const [result] = await pool.execute(
      'INSERT INTO conversations (client_id, artisan_id, product_id, order_id) VALUES (?, ?, ?, ?)',
      [clientId, artisanId, productId || null, orderId || null]
    );

    return result.insertId;
  } catch (error) {
    console.error('Erreur lors de la création/récupération de la conversation:', error);
    throw error;
  }
};

/**
 * Crée ou réutilise une conversation système pour un utilisateur
 * Les conversations système ont l'utilisateur système comme interlocuteur
 */
const getOrCreateSystemConversation = async (userId, orderId = null) => {
  try {
    const systemUserId = await getSystemUserId();
    
    // Vérifier le rôle de l'utilisateur pour déterminer qui est client et qui est artisan
    const [users] = await pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      throw new Error(`Utilisateur ${userId} non trouvé`);
    }
    
    const userRole = users[0].role;
    
    // Pour les conversations système, l'utilisateur système est toujours l'artisan
    // et l'utilisateur réel est le client (même si c'est un artisan dans le système)
    const clientId = userId;
    const artisanId = systemUserId;
    
    // Chercher une conversation système existante pour cet utilisateur
    const [existing] = await pool.execute(
      'SELECT id FROM conversations WHERE client_id = ? AND artisan_id = ? ORDER BY last_message_at DESC LIMIT 1',
      [clientId, artisanId]
    );

    if (existing.length > 0) {
      const conversationId = existing[0].id;
      
      // Mettre à jour order_id si fourni
      if (orderId) {
        await pool.execute(
          'UPDATE conversations SET order_id = ? WHERE id = ?',
          [orderId, conversationId]
        );
      }
      
      return existing[0].id;
    }

    // Créer une nouvelle conversation système
    const [result] = await pool.execute(
      'INSERT INTO conversations (client_id, artisan_id, product_id, order_id) VALUES (?, ?, ?, ?)',
      [clientId, artisanId, null, orderId || null]
    );

    return result.insertId;
  } catch (error) {
    console.error('Erreur lors de la création/récupération de la conversation système:', error);
    throw error;
  }
};

/**
 * Envoie un message automatique dans une conversation
 */
const sendSystemMessage = async (conversationId, message) => {
  try {
    const systemUserId = await getSystemUserId();

    // Récupérer les informations de la conversation pour notifier le destinataire
    const [conversations] = await pool.execute(
      'SELECT client_id, artisan_id FROM conversations WHERE id = ?',
      [conversationId]
    );

    if (conversations.length === 0) {
      throw new Error(`Conversation ${conversationId} non trouvée`);
    }

    const conversation = conversations[0];
    // Le destinataire est le client (l'utilisateur système est toujours l'artisan dans les conversations système)
    const recipientId = conversation.client_id;

    // Créer le message
    await pool.execute(
      'INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)',
      [conversationId, systemUserId, message]
    );

    // Mettre à jour la date de dernier message
    await pool.execute(
      'UPDATE conversations SET last_message_at = NOW() WHERE id = ?',
      [conversationId]
    );

    // Créer une notification pour le destinataire
    try {
      await createNotification(
        recipientId,
        'new_message',
        'Nouveau message système',
        message.length > 100 ? message.substring(0, 100) + '...' : message,
        conversationId
      );
    } catch (notifError) {
      // Ne pas bloquer l'envoi du message si la notification échoue
      console.error('Erreur lors de la création de la notification:', notifError);
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message système:', error);
    throw error;
  }
};

/**
 * Envoie un message automatique au client concernant le statut de sa commande
 */
const sendOrderStatusMessageToClient = async (orderId, status) => {
  try {
    // Récupérer les informations de la commande
    const [orders] = await pool.execute(
      `SELECT o.user_id as client_id, o.order_number, o.id as order_id
       FROM orders o
       WHERE o.id = ?`,
      [orderId]
    );

    if (orders.length === 0) {
      console.error(`Commande ${orderId} non trouvée pour message automatique`);
      return;
    }

    const order = orders[0];
    const statusMessages = {
      'paid': `Votre paiement pour la commande #${order.order_number || orderId} a été validé. Votre commande est en cours de préparation.`,
      'preparing': `Votre commande #${order.order_number || orderId} est en cours de préparation.`,
      'shipped': `Votre commande #${order.order_number || orderId} a été expédiée.`,
      'delivered': `Votre commande #${order.order_number || orderId} a été livrée. N'oubliez pas de laisser un avis !`,
      'cancelled': `Votre commande #${order.order_number || orderId} a été annulée.`
    };

    const message = statusMessages[status] || `Le statut de votre commande #${order.order_number || orderId} a été mis à jour : ${status}.`;

    // Créer ou réutiliser une conversation système pour le client
    const conversationId = await getOrCreateSystemConversation(order.client_id, order.order_id);
    
    await sendSystemMessage(conversationId, message);
  } catch (error) {
    console.error(`Erreur lors de l'envoi du message automatique au client pour commande ${orderId}:`, error);
    throw error;
  }
};

/**
 * Envoie un message automatique aux artisans pour les avertir d'une nouvelle commande à traiter
 */
const sendOrderMessageToArtisans = async (orderId, messageType = 'new_order') => {
  try {
    // Récupérer les informations de la commande et les artisans concernés
    const [artisans] = await pool.execute(
      `SELECT DISTINCT 
        a.user_id as artisan_id,
        o.user_id as client_id,
        o.order_number,
        o.id as order_id,
        oi.product_id
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       JOIN artisans a ON p.artisan_id = a.id
       WHERE o.id = ?`,
      [orderId]
    );

    if (artisans.length === 0) {
      console.log(`Aucun artisan trouvé pour la commande ${orderId}`);
      return;
    }

    const messages = {
      'new_order': `Vous avez une nouvelle commande #${artisans[0].order_number || orderId} à traiter. Le paiement a été validé, vous pouvez maintenant préparer et expédier le colis.`,
      'preparing': `La commande #${artisans[0].order_number || orderId} est en préparation. Vous pouvez maintenant l'expédier.`
    };

    const message = messages[messageType] || `Vous avez une nouvelle commande #${artisans[0].order_number || orderId} à traiter.`;

    // Pour chaque artisan, créer ou réutiliser une conversation système
    for (const artisan of artisans) {
      const conversationId = await getOrCreateSystemConversation(artisan.artisan_id, artisan.order_id);
      
      await sendSystemMessage(conversationId, message);
    }
  } catch (error) {
    console.error(`Erreur lors de l'envoi du message automatique aux artisans pour commande ${orderId}:`, error);
    throw error;
  }
};

module.exports = {
  sendOrderStatusMessageToClient,
  sendOrderMessageToArtisans,
  getOrCreateConversation,
  getOrCreateSystemConversation,
  sendSystemMessage
};

