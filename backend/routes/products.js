const express = require('express');
const { body } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const ProductController = require('../controllers/productController');

const router = express.Router();

router.get('/my-products', authenticate, authorize('artisan'), ProductController.getMyProducts);

router.get('/', ProductController.getAll);

router.get('/:id', ProductController.getById);

router.post('/', authenticate, authorize('artisan', 'admin'), upload, [
  body('name').trim().notEmpty().withMessage('Le nom est requis'),
  body('description').optional().trim(),
  body('price').isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),
  body('stock').isInt({ min: 0 }).withMessage('Le stock doit être un nombre entier positif'),
  body('categories').optional().isArray(),
], ProductController.create);

router.put('/:id', authenticate, authorize('artisan', 'admin'), upload, [
  body('name').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Le prix doit être un nombre positif'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Le stock doit être un nombre entier positif'),
], ProductController.update);

router.delete('/:id', authenticate, authorize('artisan', 'admin'), ProductController.delete);

module.exports = router;
