const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT * FROM categories ORDER BY parent_id, name'
    );

    const categoryMap = {};
    const rootCategories = [];

    categories.forEach(cat => {
      categoryMap[cat.id] = { ...cat, children: [] };
    });

    categories.forEach(cat => {
      if (cat.parent_id) {
        if (categoryMap[cat.parent_id]) {
          categoryMap[cat.parent_id].children.push(categoryMap[cat.id]);
        }
      } else {
        rootCategories.push(categoryMap[cat.id]);
      }
    });

    res.json({ categories: rootCategories, flat: categories });
  } catch (error) {
    console.error('Erreur récupération catégories:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories' });
  }
});

router.post('/', authenticate, authorize('admin'), [
  body('name').trim().notEmpty(),
  body('slug').trim().notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, slug, parent_id } = req.body;

    const [result] = await pool.execute(
      'INSERT INTO categories (name, slug, parent_id) VALUES (?, ?, ?)',
      [name, slug, parent_id || null]
    );

    res.status(201).json({
      message: 'Catégorie créée avec succès',
      category: { id: result.insertId, name, slug, parent_id }
    });
  } catch (error) {
    console.error('Erreur création catégorie:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la catégorie' });
  }
});

module.exports = router;

