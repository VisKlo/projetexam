const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/stats', async (req, res) => {
  try {
    const [stats] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'client') as total_clients,
        (SELECT COUNT(*) FROM users WHERE role = 'artisan') as total_artisans,
        (SELECT COUNT(*) FROM products WHERE is_active = TRUE) as total_products,
        (SELECT COUNT(*) FROM orders) as total_orders,
        (SELECT SUM(total) FROM orders WHERE payment_status = 'paid') as total_revenue,
        (SELECT COUNT(*) FROM orders WHERE status = 'pending') as pending_orders,
        (SELECT COUNT(*) FROM orders WHERE payment_status = 'paid') as paid_orders
    `);

    const [monthlyStats] = await pool.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as order_count,
        SUM(total) as revenue
      FROM orders
      WHERE payment_status = 'paid'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `);

    // Convertir les valeurs numériques
    const generalStats = stats[0];
    if (generalStats) {
      generalStats.total_revenue = parseFloat(generalStats.total_revenue) || 0;
      generalStats.total_users = parseInt(generalStats.total_users) || 0;
      generalStats.total_clients = parseInt(generalStats.total_clients) || 0;
      generalStats.total_artisans = parseInt(generalStats.total_artisans) || 0;
      generalStats.total_products = parseInt(generalStats.total_products) || 0;
      generalStats.total_orders = parseInt(generalStats.total_orders) || 0;
      generalStats.pending_orders = parseInt(generalStats.pending_orders) || 0;
      generalStats.paid_orders = parseInt(generalStats.paid_orders) || 0;
    }

    // Convertir les revenus mensuels
    for (const monthStat of monthlyStats) {
      monthStat.revenue = parseFloat(monthStat.revenue) || 0;
      monthStat.order_count = parseInt(monthStat.order_count) || 0;
    }

    res.json({
      general: generalStats,
      monthly: monthlyStats
    });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, role, first_name, last_name, phone, is_active, created_at, last_login FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (error) {
    console.error('Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
});

router.get('/artisans', async (req, res) => {
  try {
    const [artisans] = await pool.execute(`
      SELECT 
        a.*,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(DISTINCT p.id) as product_count
      FROM artisans a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN products p ON a.id = p.artisan_id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);
    res.json({ artisans });
  } catch (error) {
    console.error('Erreur récupération artisans:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des artisans' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { status, payment_status } = req.query;

    let query = `
      SELECT o.*, u.first_name, u.last_name, u.email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    if (payment_status) {
      query += ' AND o.payment_status = ?';
      params.push(payment_status);
    }

    query += ' ORDER BY o.created_at DESC';

    const [orders] = await pool.execute(query, params);

    for (const order of orders) {
      // Convertir total en nombre
      order.total = parseFloat(order.total) || 0;
      
      const [items] = await pool.execute(
        `SELECT oi.*, p.name as product_name, CONCAT(u.first_name, ' ', u.last_name) as artisan_name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN artisans a ON p.artisan_id = a.id
        JOIN users u ON a.user_id = u.id
        WHERE oi.order_id = ?`,
        [order.id]
      );
      
      // Convertir les prix des items en nombres
      for (const item of items) {
        item.price = parseFloat(item.price) || 0;
        item.quantity = parseInt(item.quantity) || 0;
      }
      
      order.items = items;
    }

    res.json({ orders });
  } catch (error) {
    console.error('Erreur récupération commandes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des commandes' });
  }
});

// Gestion des produits
router.get('/products', async (req, res) => {
  try {
    const { is_active, artisan_id } = req.query;
    
    let sql = `
      SELECT 
        p.*,
        CONCAT(u.first_name, ' ', u.last_name) as artisan_name,
        a.id as artisan_id,
        a.user_id as artisan_user_id,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM products p
      JOIN artisans a ON p.artisan_id = a.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE 1=1
    `;
    const params = [];

    if (is_active !== undefined) {
      sql += ' AND p.is_active = ?';
      params.push(is_active === 'true' ? 1 : 0);
    }

    if (artisan_id) {
      sql += ' AND p.artisan_id = ?';
      params.push(artisan_id);
    }

    sql += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const [products] = await pool.execute(sql, params);

    // Convertir les valeurs numériques et ajouter les catégories
    for (const product of products) {
      product.average_rating = parseFloat(product.average_rating) || 0;
      product.review_count = parseInt(product.review_count) || 0;
      product.price = parseFloat(product.price) || 0;
      product.stock = parseInt(product.stock) || 0;
      
      // Récupérer les catégories
      const [categories] = await pool.execute(
        'SELECT c.id, c.name, c.slug FROM categories c JOIN product_categories pc ON c.id = pc.category_id WHERE pc.product_id = ?',
        [product.id]
      );
      product.categories = categories;
    }

    res.json({ products });
  } catch (error) {
    console.error('Erreur récupération produits:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
  }
});

// Gestion des catégories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT * FROM categories ORDER BY parent_id, name'
    );
    res.json({ categories });
  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories' });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, parent_id } = req.body;

    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (slug) { updates.push('slug = ?'); params.push(slug); }
    if (parent_id !== undefined) { updates.push('parent_id = ?'); params.push(parent_id || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification à apporter' });
    }

    params.push(id);
    await pool.execute(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    res.json({ message: 'Catégorie mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur modification catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la modification de la catégorie' });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier s'il y a des produits associés
    const [products] = await pool.execute(
      'SELECT COUNT(*) as count FROM product_categories WHERE category_id = ?',
      [id]
    );

    if (products[0].count > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer une catégorie avec des produits associés' });
    }

    // Vérifier s'il y a des sous-catégories
    const [children] = await pool.execute(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
      [id]
    );

    if (children[0].count > 0) {
      return res.status(400).json({ error: 'Impossible de supprimer une catégorie avec des sous-catégories' });
    }

    await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Catégorie supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la catégorie' });
  }
});

// Gestion des artisans (approbation)
router.put('/artisans/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_approved } = req.body;

    await pool.execute(
      'UPDATE artisans SET is_approved = ? WHERE id = ?',
      [is_approved ? 1 : 0, id]
    );

    res.json({ message: `Artisan ${is_approved ? 'approuvé' : 'désapprouvé'} avec succès` });
  } catch (error) {
    console.error('Erreur approbation artisan:', error);
    res.status(500).json({ error: 'Erreur lors de l\'approbation de l\'artisan' });
  }
});

// Gestion des utilisateurs (activation/désactivation)
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    // Empêcher l'admin de désactiver son propre compte
    if (parseInt(id) === req.user.id && !is_active) {
      return res.status(403).json({ 
        error: 'Action non autorisée',
        details: 'Vous ne pouvez pas désactiver votre propre compte'
      });
    }

    await pool.execute(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, id]
    );

    res.json({ message: `Utilisateur ${is_active ? 'activé' : 'désactivé'} avec succès` });
  } catch (error) {
    console.error('Erreur modification statut utilisateur:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du statut' });
  }
});

// Supprimer un utilisateur
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Empêcher l'admin de supprimer son propre compte
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ 
        error: 'Action non autorisée',
        details: 'Vous ne pouvez pas supprimer votre propre compte'
      });
    }

    // Vérifier que l'utilisateur existe
    const [users] = await pool.execute(
      'SELECT id, email, role FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        error: 'Utilisateur non trouvé',
        details: `L'utilisateur avec l'ID ${id} n'existe pas`
      });
    }

    const user = users[0];

    // Si c'est un artisan, supprimer aussi le profil artisan
    if (user.role === 'artisan') {
      await pool.execute('DELETE FROM artisans WHERE user_id = ?', [id]);
    }

    // Supprimer l'utilisateur (les contraintes CASCADE supprimeront automatiquement les relations)
    await pool.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({ 
      message: 'Utilisateur supprimé avec succès',
      details: `L'utilisateur ${user.email} a été définitivement supprimé`
    });
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: 'Impossible de supprimer cet utilisateur',
        details: 'Cet utilisateur a des commandes ou autres relations actives. Désactivez-le plutôt que de le supprimer.'
      });
    }

    res.status(500).json({ 
      error: 'Erreur lors de la suppression de l\'utilisateur',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Gestion des produits (activation/désactivation)
router.put('/products/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await pool.execute(
      'UPDATE products SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, id]
    );

    res.json({ message: `Produit ${is_active ? 'activé' : 'désactivé'} avec succès` });
  } catch (error) {
    console.error('Erreur modification statut produit:', error);
    res.status(500).json({ error: 'Erreur lors de la modification du statut' });
  }
});

// Supprimer définitivement un produit
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le produit existe
    const [products] = await pool.execute(
      'SELECT id, name FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ 
        error: 'Produit non trouvé',
        details: `Le produit avec l'ID ${id} n'existe pas`
      });
    }

    // Supprimer les relations avec les catégories
    await pool.execute('DELETE FROM product_categories WHERE product_id = ?', [id]);
    
    // Supprimer les avis associés
    await pool.execute('DELETE FROM reviews WHERE product_id = ?', [id]);
    
    // Supprimer les favoris associés
    await pool.execute('DELETE FROM favorites WHERE product_id = ?', [id]);
    
    // Supprimer le produit
    await pool.execute('DELETE FROM products WHERE id = ?', [id]);

    res.json({ 
      message: 'Produit supprimé définitivement avec succès',
      details: 'Le produit et toutes ses relations ont été supprimés'
    });
  } catch (error) {
    console.error('Erreur suppression produit:', error);
    
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ 
        error: 'Impossible de supprimer ce produit',
        details: 'Ce produit est référencé dans des commandes. Désactivez-le plutôt que de le supprimer.'
      });
    }

    res.status(500).json({ 
      error: 'Erreur lors de la suppression du produit',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Gestion des rôles utilisateurs
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Empêcher l'admin de changer son propre rôle
    if (parseInt(id) === req.user.id) {
      return res.status(403).json({ 
        error: 'Action non autorisée',
        details: 'Vous ne pouvez pas modifier votre propre rôle'
      });
    }

    // Vérifier que le rôle est valide
    const validRoles = ['client', 'artisan', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        error: 'Rôle invalide',
        details: `Le rôle doit être l'un des suivants: ${validRoles.join(', ')}`
      });
    }

    // Vérifier que l'utilisateur existe
    const [users] = await pool.execute(
      'SELECT id, role FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        error: 'Utilisateur non trouvé',
        details: `L'utilisateur avec l'ID ${id} n'existe pas`
      });
    }

    const user = users[0];

    // Si on passe d'artisan à autre chose, supprimer le profil artisan
    if (user.role === 'artisan' && role !== 'artisan') {
      await pool.execute('DELETE FROM artisans WHERE user_id = ?', [id]);
    }

    // Si on passe à artisan, créer le profil artisan s'il n'existe pas
    if (role === 'artisan' && user.role !== 'artisan') {
      const [existingArtisan] = await pool.execute(
        'SELECT id FROM artisans WHERE user_id = ?',
        [id]
      );
      if (existingArtisan.length === 0) {
        const [userInfo] = await pool.execute(
          'SELECT first_name, last_name FROM users WHERE id = ?',
          [id]
        );
        await pool.execute(
          'INSERT INTO artisans (user_id, business_name, is_approved) VALUES (?, ?, ?)',
          [id, `${userInfo[0].first_name} ${userInfo[0].last_name}`, false]
        );
      }
    }

    // Mettre à jour le rôle
    await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );

    res.json({ 
      message: `Rôle de l'utilisateur mis à jour avec succès`,
      details: `L'utilisateur a maintenant le rôle: ${role}`
    });
  } catch (error) {
    console.error('Erreur modification rôle:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la modification du rôle',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Gestion des commentaires/avis
router.get('/reviews', async (req, res) => {
  try {
    const { product_id, user_id } = req.query;
    
    let sql = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        u.email,
        p.name as product_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (product_id) {
      sql += ' AND r.product_id = ?';
      params.push(product_id);
    }

    if (user_id) {
      sql += ' AND r.user_id = ?';
      params.push(user_id);
    }

    sql += ' ORDER BY r.created_at DESC';

    const [reviews] = await pool.execute(sql, params);
    res.json({ reviews });
  } catch (error) {
    console.error('Erreur récupération avis:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des avis' });
  }
});

router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que l'avis existe
    const [reviews] = await pool.execute(
      'SELECT id, product_id, user_id FROM reviews WHERE id = ?',
      [id]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ 
        error: 'Avis non trouvé',
        details: `L'avis avec l'ID ${id} n'existe pas`
      });
    }

    // Supprimer l'avis
    await pool.execute('DELETE FROM reviews WHERE id = ?', [id]);

    res.json({ 
      message: 'Avis supprimé avec succès',
      details: 'L\'avis a été définitivement supprimé'
    });
  } catch (error) {
    console.error('Erreur suppression avis:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la suppression de l\'avis',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


// Route pour supprimer un produit (suppression définitive pour les admins)
router.delete('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifier que le produit existe
    const [products] = await pool.execute(
      'SELECT id FROM products WHERE id = ?',
      [id]
    );

    if (products.length === 0) {
      return res.status(404).json({ 
        error: 'Produit non trouvé',
        details: `Le produit avec l'ID ${id} n'existe pas`
      });
    }

    // Vérifier si le produit est référencé dans des commandes
    const [orderItems] = await pool.execute(
      'SELECT COUNT(*) as count FROM order_items WHERE product_id = ?',
      [id]
    );

    if (parseInt(orderItems[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Impossible de supprimer le produit',
        details: 'Ce produit est référencé dans des commandes. Vous pouvez le désactiver à la place.'
      });
    }

    // Supprimer les associations avec les catégories
    await pool.execute(
      'DELETE FROM product_categories WHERE product_id = ?',
      [id]
    );

    // Supprimer les avis associés
    await pool.execute(
      'DELETE FROM reviews WHERE product_id = ?',
      [id]
    );

    // Supprimer le produit
    await pool.execute(
      'DELETE FROM products WHERE id = ?',
      [id]
    );

    res.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ 
      error: 'Erreur lors de la suppression du produit',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

