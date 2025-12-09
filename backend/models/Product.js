const pool = require('../config/database');

class Product {
  static async findAll(filters = {}) {
    let query = `
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
      WHERE p.is_active = TRUE
    `;
    const params = [];

    if (filters.featured !== undefined) {
      query += ` AND p.is_featured = ?`;
      params.push(filters.featured ? 1 : 0);
    }

    if (filters.category) {
      query += ` AND p.id IN (
        SELECT product_id FROM product_categories WHERE category_id = ?
      )`;
      params.push(filters.category);
    }

    if (filters.search) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.minPrice) {
      query += ` AND p.price >= ?`;
      params.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      query += ` AND p.price <= ?`;
      params.push(filters.maxPrice);
    }

    query += ` GROUP BY p.id ORDER BY p.created_at DESC`;

    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
    }

    const [products] = await pool.execute(query, params);
    
    for (const product of products) {
      product.average_rating = parseFloat(product.average_rating) || 0;
      product.review_count = parseInt(product.review_count) || 0;
      // Charger les médias pour chaque produit
      product.media = await this.getMedia(product.id);
    }

    return products;
  }

  static async findById(id) {
    const [products] = await pool.execute(
      `SELECT 
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
      WHERE p.id = ?
      GROUP BY p.id`,
      [id]
    );
    
    if (products.length === 0) return null;
    
    const product = products[0];
    product.average_rating = parseFloat(product.average_rating) || 0;
    product.review_count = parseInt(product.review_count) || 0;
    
    // Charger les médias
    product.media = await this.getMedia(id);
    
    return product;
  }

  static async getMedia(productId) {
    const [media] = await pool.execute(
      'SELECT * FROM product_media WHERE product_id = ? ORDER BY display_order ASC, id ASC',
      [productId]
    );
    return media;
  }

  static async addMedia(productId, mediaType, mediaUrl, displayOrder = 0) {
    const [result] = await pool.execute(
      'INSERT INTO product_media (product_id, media_type, media_url, display_order) VALUES (?, ?, ?, ?)',
      [productId, mediaType, mediaUrl, displayOrder]
    );
    return result.insertId;
  }

  static async deleteMedia(mediaId) {
    await pool.execute('DELETE FROM product_media WHERE id = ?', [mediaId]);
  }

  static async deleteAllMedia(productId) {
    await pool.execute('DELETE FROM product_media WHERE product_id = ?', [productId]);
  }

  static async create(productData) {
    const { artisan_id, name, description, price, stock, image_url, categories } = productData;
    
    // Générer un slug simple
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    const [result] = await pool.execute(
      'INSERT INTO products (artisan_id, name, slug, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [artisan_id, name, slug, description, price, stock, image_url]
    );

    const productId = result.insertId;

    // Ajouter les catégories
    if (categories && categories.length > 0) {
      for (const categoryId of categories) {
        await pool.execute(
          'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
          [productId, categoryId]
        );
      }
    }

    return productId;
  }

  static async update(id, productData) {
    const { name, description, price, stock, image_url, is_active, is_featured, categories } = productData;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      updates.push('name = ?', 'slug = ?');
      params.push(name, slug);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (price !== undefined) {
      updates.push('price = ?');
      params.push(price);
    }
    if (stock !== undefined) {
      updates.push('stock = ?');
      params.push(stock);
    }
    if (image_url !== undefined) {
      updates.push('image_url = ?');
      params.push(image_url);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }
    if (is_featured !== undefined) {
      updates.push('is_featured = ?');
      params.push(is_featured);
    }

    if (updates.length > 0) {
      params.push(id);
      await pool.execute(
        `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
    }

    // Mettre à jour les catégories si fournies
    if (categories !== undefined) {
      await pool.execute('DELETE FROM product_categories WHERE product_id = ?', [id]);
      if (categories.length > 0) {
        for (const categoryId of categories) {
          await pool.execute(
            'INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)',
            [id, categoryId]
          );
        }
      }
    }
  }

  static async delete(id) {
    await pool.execute('DELETE FROM products WHERE id = ?', [id]);
  }

  static async findByArtisanId(artisanId) {
    const [products] = await pool.execute(
      `SELECT 
        p.*,
        CONCAT(u.first_name, ' ', u.last_name) as artisan_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM products p
      JOIN artisans a ON p.artisan_id = a.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.artisan_id = ?
      GROUP BY p.id
      ORDER BY p.created_at DESC`,
      [artisanId]
    );
    
    for (const product of products) {
      product.average_rating = parseFloat(product.average_rating) || 0;
      product.review_count = parseInt(product.review_count) || 0;
    }
    
    return products;
  }
}

module.exports = Product;

