const { validationResult } = require('express-validator');
const Product = require('../models/Product');
const pool = require('../config/database');

class ProductController {
  static async getAll(req, res) {
    try {
      const filters = {
        category: req.query.category,
        search: req.query.search,
        minPrice: req.query.minPrice,
        maxPrice: req.query.maxPrice,
        featured: req.query.featured === 'true' ? true : (req.query.featured === 'false' ? false : undefined),
        limit: req.query.limit ? parseInt(req.query.limit) : undefined
      };

      const products = await Product.findAll(filters);

      // Ajouter les catégories pour chaque produit
      for (const product of products) {
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
  }

  static async getById(req, res) {
    try {
      const product = await Product.findById(req.params.id);
      
      if (!product) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      // Ajouter les catégories
      const [categories] = await pool.execute(
        'SELECT c.id, c.name, c.slug FROM categories c JOIN product_categories pc ON c.id = pc.category_id WHERE pc.product_id = ?',
        [product.id]
      );
      product.categories = categories;

      // Ajouter les avis avec réponses artisan
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
        [product.id]
      );
      
      // S'assurer que artisan_reply et artisan_reply_at sont inclus
      for (const review of reviews) {
        review.artisan_reply = review.artisan_reply || null;
        review.artisan_reply_at = review.artisan_reply_at || null;
      }
      product.reviews = reviews;

      res.json({ product });
    } catch (error) {
      console.error('Erreur récupération produit:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du produit' });
    }
  }

  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Récupérer l'artisan_id à partir du user_id
      const [artisans] = await pool.execute(
        'SELECT id FROM artisans WHERE user_id = ?',
        [req.user.id]
      );

      if (artisans.length === 0) {
        return res.status(403).json({ error: 'Vous n\'êtes pas un artisan' });
      }

      const artisanId = artisans[0].id;
      const { name, description, price, stock, categories } = req.body;
      
      // Utiliser la première image comme image_url pour compatibilité
      const image_url = req.uploadedImages && req.uploadedImages.length > 0 
        ? req.uploadedImages[0].path 
        : null;

      const productId = await Product.create({
        artisan_id: artisanId,
        name,
        description,
        price: parseFloat(price),
        stock: parseInt(stock),
        image_url,
        categories: categories || []
      });

      // Ajouter tous les médias (images et vidéos)
      let displayOrder = 0;
      if (req.uploadedImages && req.uploadedImages.length > 0) {
        for (const image of req.uploadedImages) {
          await Product.addMedia(productId, 'image', image.path, displayOrder++);
        }
      }
      if (req.uploadedVideos && req.uploadedVideos.length > 0) {
        for (const video of req.uploadedVideos) {
          await Product.addMedia(productId, 'video', video.path, displayOrder++);
        }
      }

      res.status(201).json({
        message: 'Produit créé avec succès',
        productId
      });
    } catch (error) {
      console.error('Erreur création produit:', error);
      res.status(500).json({ error: 'Erreur lors de la création du produit' });
    }
  }

  static async update(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const productId = req.params.id;
      const { name, description, price, stock, is_active, is_featured, categories } = req.body;
      
      // Utiliser la première image comme image_url pour compatibilité si une nouvelle image est uploadée
      const image_url = req.uploadedImages && req.uploadedImages.length > 0 
        ? req.uploadedImages[0].path 
        : undefined;
      
      // Seuls les admins peuvent modifier is_featured
      if (is_featured !== undefined && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Seuls les administrateurs peuvent modifier le statut "featured"' });
      }

      // Vérifier les permissions
      const [products] = await pool.execute(
        'SELECT artisan_id FROM products WHERE id = ?',
        [productId]
      );

      if (products.length === 0) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      // Les admins peuvent toujours modifier les produits
      if (req.user.role === 'admin') {
        // Les admins peuvent modifier n'importe quel produit, y compris is_featured
      } else {
        // Pour les non-admins, vérifier qu'ils sont l'artisan du produit
        const [artisans] = await pool.execute(
          'SELECT id FROM artisans WHERE user_id = ?',
          [req.user.id]
        );

        if (artisans.length === 0 || artisans[0].id !== products[0].artisan_id) {
          return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier ce produit' });
        }
      }

      await Product.update(productId, {
        name,
        description,
        price: price ? parseFloat(price) : undefined,
        stock: stock ? parseInt(stock) : undefined,
        image_url,
        is_active,
        is_featured: is_featured !== undefined ? (is_featured === true || is_featured === 'true') : undefined,
        categories
      });

      // Ajouter les nouveaux médias (images et vidéos) si présents
      if (req.uploadedImages && req.uploadedImages.length > 0) {
        const existingMedia = await Product.getMedia(productId);
        let displayOrder = existingMedia.length;
        for (const image of req.uploadedImages) {
          await Product.addMedia(productId, 'image', image.path, displayOrder++);
        }
      }
      if (req.uploadedVideos && req.uploadedVideos.length > 0) {
        const existingMedia = await Product.getMedia(productId);
        let displayOrder = existingMedia.length;
        for (const video of req.uploadedVideos) {
          await Product.addMedia(productId, 'video', video.path, displayOrder++);
        }
      }

      res.json({ message: 'Produit mis à jour avec succès' });
    } catch (error) {
      console.error('Erreur mise à jour produit:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
    }
  }

  static async delete(req, res) {
    try {
      const productId = req.params.id;

      // Vérifier les permissions
      const [products] = await pool.execute(
        'SELECT artisan_id FROM products WHERE id = ?',
        [productId]
      );

      if (products.length === 0) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      const [artisans] = await pool.execute(
        'SELECT id FROM artisans WHERE user_id = ?',
        [req.user.id]
      );

      if (artisans.length === 0 || (artisans[0].id !== products[0].artisan_id && req.user.role !== 'admin')) {
        return res.status(403).json({ error: 'Vous n\'avez pas la permission de supprimer ce produit' });
      }

      await Product.delete(productId);

      res.json({ message: 'Produit supprimé avec succès' });
    } catch (error) {
      console.error('Erreur suppression produit:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du produit' });
    }
  }

  static async getMyProducts(req, res) {
    try {
      const [artisans] = await pool.execute(
        'SELECT id FROM artisans WHERE user_id = ?',
        [req.user.id]
      );

      if (artisans.length === 0) {
        return res.status(403).json({ error: 'Vous n\'êtes pas un artisan' });
      }

      const artisanId = artisans[0].id;
      const products = await Product.findByArtisanId(artisanId);

      // Ajouter les catégories
      for (const product of products) {
        const [categories] = await pool.execute(
          'SELECT c.id, c.name, c.slug FROM categories c JOIN product_categories pc ON c.id = pc.category_id WHERE pc.product_id = ?',
          [product.id]
        );
        product.categories = categories;
      }

      res.json({ products });
    } catch (error) {
      console.error('Erreur récupération produits artisan:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des produits' });
    }
  }
}

module.exports = ProductController;

