const express = require('express');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
// Permettre l'accès aux clients, artisans et admins
router.use((req, res, next) => {
  if (['client', 'artisan', 'admin'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ error: 'Accès refusé' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [favorites] = await pool.execute(
      `SELECT 
        p.*,
        CONCAT(u.first_name, ' ', u.last_name) as artisan_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      JOIN artisans a ON p.artisan_id = a.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE f.user_id = ? AND p.is_active = TRUE
      GROUP BY p.id
      ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    // Convertir average_rating en nombre
    for (const favorite of favorites) {
      favorite.average_rating = parseFloat(favorite.average_rating) || 0;
      favorite.review_count = parseInt(favorite.review_count) || 0;
    }

    res.json({ favorites });
  } catch (error) {
    console.error('Erreur récupération favoris:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris' });
  }
});

router.post('/:product_id', async (req, res) => {
  try {
    const { product_id } = req.params;

    const [products] = await pool.execute(
      'SELECT id FROM products WHERE id = ? AND is_active = TRUE',
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ error: 'Produit non trouvé' });
    }

    const [existing] = await pool.execute(
      'SELECT * FROM favorites WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Ce produit est déjà dans vos favoris' });
    }

    await pool.execute(
      'INSERT INTO favorites (user_id, product_id) VALUES (?, ?)',
      [req.user.id, product_id]
    );

    res.status(201).json({ message: 'Produit ajouté aux favoris' });
  } catch (error) {
    console.error('Erreur ajout favori:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout aux favoris' });
  }
});

router.delete('/:product_id', async (req, res) => {
  try {
    const { product_id } = req.params;

    await pool.execute(
      'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
      [req.user.id, product_id]
    );

    res.json({ message: 'Produit retiré des favoris' });
  } catch (error) {
    console.error('Erreur suppression favori:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du favori' });
  }
});

module.exports = router;

