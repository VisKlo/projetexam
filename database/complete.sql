-- ============================================
-- FICHIER SQL COMPLET - ARTISASHOP
-- ============================================
-- Ce fichier contient toutes les commandes SQL nécessaires
-- pour créer et configurer la base de données complète.
-- 
-- INSTRUCTIONS :
-- 1. Exécutez ce fichier dans MySQL/phpMyAdmin
-- 2. Toutes les tables, migrations et données seront créées automatiquement
-- ============================================

-- ============================================
-- PARTIE 1 : CRÉATION DE LA BASE DE DONNÉES
-- ============================================

CREATE DATABASE IF NOT EXISTS ecommerce_artisanat;
USE ecommerce_artisanat;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('client', 'artisan', 'admin') DEFAULT 'client',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: artisans
-- ============================================
CREATE TABLE artisans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: categories
-- ============================================
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    parent_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_slug (slug),
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: products
-- ============================================
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    artisan_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    stock INT DEFAULT 0 CHECK (stock >= 0),
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (artisan_id) REFERENCES artisans(id) ON DELETE CASCADE,
    INDEX idx_artisan (artisan_id),
    INDEX idx_slug (slug),
    INDEX idx_active (is_active),
    FULLTEXT idx_search (name, description)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: product_categories
-- ============================================
CREATE TABLE product_categories (
    product_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: orders
-- ============================================
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid',
    total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
    shipping_address TEXT NOT NULL,
    tracking_number VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_order_number (order_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: order_items
-- ============================================
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    INDEX idx_order (order_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: payments
-- ============================================
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_intent_id VARCHAR(255) UNIQUE,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
    status ENUM('pending', 'succeeded', 'failed', 'refunded') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order (order_id),
    INDEX idx_status (status),
    INDEX idx_payment_intent (payment_intent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: reviews
-- ============================================
CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_product (user_id, product_id),
    INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: favorites
-- ============================================
CREATE TABLE favorites (
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, product_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TABLE: notifications
-- ============================================
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TRIGGERS
-- ============================================

-- Générer automatiquement le numéro de commande
DELIMITER //
CREATE TRIGGER generate_order_number BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        SET NEW.order_number = CONCAT('ORD-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', 
            LPAD((SELECT COALESCE(MAX(CAST(SUBSTRING(order_number, -4) AS UNSIGNED)), 0) + 1 
                  FROM orders WHERE DATE(created_at) = CURDATE()), 4, '0'));
    END IF;
END//
DELIMITER ;

-- Mettre à jour le stock après une commande
DELIMITER //
CREATE TRIGGER update_stock_after_order AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE products 
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;
END//
DELIMITER ;

-- ============================================
-- DONNÉES INITIALES
-- ============================================

-- Admin par défaut (mot de passe: admin123)
INSERT INTO users (email, password, role, first_name, last_name, phone, is_active) VALUES 
('admin@example.com', '$2a$10$5XOn3Zdz1peQzzWEyl1ZM.FvKTS6ZbIia7mhDXkcFdyKtLrFcsANi', 'admin', 'Clovis', 'Jocaille', '0123456789', TRUE)
ON DUPLICATE KEY UPDATE password = VALUES(password);

-- Catégories principales
INSERT INTO categories (name, slug, parent_id) VALUES
('Décoration', 'decoration', NULL),
('Mobilier', 'mobilier', NULL),
('Mode & Accessoires', 'mode-accessoires', NULL),
('Art de la Table', 'art-de-la-table', NULL),
('Bijoux', 'bijoux', NULL)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ============================================
-- PARTIE 2 : MIGRATIONS
-- ============================================

-- Migration 1: Ajouter le champ address à la table users
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = DATABASE())
      AND (TABLE_NAME = 'users')
      AND (COLUMN_NAME = 'address')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN address TEXT NULL AFTER phone'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Migration 2: Ajouter le système de réponses aux avis
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = DATABASE())
      AND (TABLE_NAME = 'reviews')
      AND (COLUMN_NAME = 'artisan_reply')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE reviews ADD COLUMN artisan_reply TEXT NULL AFTER comment, ADD COLUMN artisan_reply_at TIMESTAMP NULL AFTER artisan_reply'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Migration 3: Ajouter le champ last_login à la table users
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = DATABASE())
      AND (TABLE_NAME = 'users')
      AND (COLUMN_NAME = 'last_login')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL AFTER updated_at'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Migration 4: Ajouter le champ shipping_phone à la table orders
-- Vérifier si la colonne existe déjà (pour éviter les erreurs si la migration est déjà appliquée)
SET @dbname = DATABASE();
SET @tablename = 'orders';
SET @columnname = 'shipping_phone';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1', -- La colonne existe déjà, ne rien faire
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) NOT NULL DEFAULT "" AFTER shipping_address')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Pour les commandes existantes, copier le téléphone de l'utilisateur si disponible
UPDATE orders o
JOIN users u ON o.user_id = u.id
SET o.shipping_phone = u.phone
WHERE (o.shipping_phone IS NULL OR o.shipping_phone = '') AND u.phone IS NOT NULL AND u.phone != '';

-- Si certaines commandes n'ont toujours pas de téléphone, mettre une valeur par défaut
UPDATE orders 
SET shipping_phone = 'Non renseigné'
WHERE shipping_phone IS NULL OR shipping_phone = '';

-- Migration 5: Ajouter la table messages pour la messagerie entre clients et artisans
-- Table pour les conversations
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    artisan_id INT NOT NULL,
    product_id INT NULL,
    order_id INT NULL,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (artisan_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    UNIQUE KEY unique_conversation (client_id, artisan_id, product_id),
    INDEX idx_client (client_id),
    INDEX idx_artisan (artisan_id),
    INDEX idx_last_message (last_message_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pour les messages
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table pour la suppression de conversations (soft delete)
CREATE TABLE IF NOT EXISTS conversation_deletions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_conversation (conversation_id, user_id),
    INDEX idx_user (user_id),
    INDEX idx_conversation (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration 6: Ajouter le champ is_featured dans la table products
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = DATABASE())
      AND (TABLE_NAME = 'products')
      AND (COLUMN_NAME = 'is_featured')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE AFTER is_active'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Index pour améliorer les performances des requêtes sur les produits featured
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = DATABASE())
      AND (TABLE_NAME = 'products')
      AND (INDEX_NAME = 'idx_featured')
  ) > 0,
  'SELECT 1',
  'CREATE INDEX idx_featured ON products(is_featured, is_active)'
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- Migration 7: Ajouter la table product_media pour gérer plusieurs images et vidéos par produit
CREATE TABLE IF NOT EXISTS product_media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    media_type ENUM('image', 'video') NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_type (media_type),
    INDEX idx_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrer les images existantes depuis image_url vers product_media
INSERT INTO product_media (product_id, media_type, media_url, display_order)
SELECT id, 'image', image_url, 0
FROM products
WHERE image_url IS NOT NULL AND image_url != ''
AND NOT EXISTS (
    SELECT 1 FROM product_media pm WHERE pm.product_id = products.id
);

-- Migration 8: Ajouter la colonne video_url pour les produits (optionnel, peut être obsolète)
-- Cette colonne peut être utilisée pour compatibilité, mais product_media est préféré
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = DATABASE())
      AND (TABLE_NAME = 'products')
      AND (COLUMN_NAME = 'video_url')
  ) > 0,
  'SELECT 1',
  'ALTER TABLE products ADD COLUMN video_url VARCHAR(500) NULL AFTER image_url'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- PARTIE 3 : DONNÉES DE TEST (OPTIONNEL)
-- ============================================
-- Décommentez cette section si vous voulez ajouter des données de test
-- Mot de passe pour tous les utilisateurs de test: admin123

/*
-- UTILISATEURS
INSERT INTO users (email, password, role, first_name, last_name, phone, is_active) VALUES
-- Clients
('marie.dupont@email.com', '$2a$10$5XOn3Zdz1peQzzWEyl1ZM.FvKTS6ZbIia7mhDXkcFdyKtLrFcsANi', 'client', 'Marie', 'Dupont', '0612345678', TRUE),
('jean.martin@email.com', '$2a$10$5XOn3Zdz1peQzzWEyl1ZM.FvKTS6ZbIia7mhDXkcFdyKtLrFcsANi', 'client', 'Jean', 'Martin', '0623456789', TRUE),
('sophie.bernard@email.com', '$2a$10$5XOn3Zdz1peQzzWEyl1ZM.FvKTS6ZbIia7mhDXkcFdyKtLrFcsANi', 'client', 'Sophie', 'Bernard', '0634567890', TRUE),
-- Artisans
('artisan.ceramique@email.com', '$2a$10$5XOn3Zdz1peQzzWEyl1ZM.FvKTS6ZbIia7mhDXkcFdyKtLrFcsANi', 'artisan', 'Isabelle', 'Potier', '0645678901', TRUE),
('artisan.bois@email.com', '$2a$10$5XOn3Zdz1peQzzWEyl1ZM.FvKTS6ZbIia7mhDXkcFdyKtLrFcsANi', 'artisan', 'Marc', 'Menuisier', '0656789012', TRUE),
('artisan.textile@email.com', '$2a$10$5XOn3Zdz1peQzzWEyl1ZM.FvKTS6ZbIia7mhDXkcFdyKtLrFcsANi', 'artisan', 'Claire', 'Tisserand', '0667890123', TRUE)
ON DUPLICATE KEY UPDATE password = VALUES(password);

-- ARTISANS
INSERT INTO artisans (user_id, business_name, description, is_approved) VALUES
((SELECT id FROM users WHERE email = 'artisan.ceramique@email.com'), 'Atelier Céramique Isabelle', 'Création de poteries et céramiques artisanales uniques.', TRUE),
((SELECT id FROM users WHERE email = 'artisan.bois@email.com'), 'Menuiserie Artisanale Marc', 'Fabrication de meubles en bois massif sur mesure.', TRUE),
((SELECT id FROM users WHERE email = 'artisan.textile@email.com'), 'Tissages de Claire', 'Création de textiles artisanaux : écharpes, coussins, tapis.', TRUE)
ON DUPLICATE KEY UPDATE business_name = VALUES(business_name);

-- SOUS-CATÉGORIES
INSERT INTO categories (name, slug, parent_id) 
SELECT 'Vases et Pots', 'vases-pots', id FROM categories WHERE slug = 'decoration'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO categories (name, slug, parent_id) 
SELECT 'Luminaires', 'luminaires', id FROM categories WHERE slug = 'decoration'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO categories (name, slug, parent_id) 
SELECT 'Tables', 'tables', id FROM categories WHERE slug = 'mobilier'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO categories (name, slug, parent_id) 
SELECT 'Chaises', 'chaises', id FROM categories WHERE slug = 'mobilier'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO categories (name, slug, parent_id) 
SELECT 'Écharpes', 'echarpes', id FROM categories WHERE slug = 'mode-accessoires'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO categories (name, slug, parent_id) 
SELECT 'Assiettes', 'assiettes', id FROM categories WHERE slug = 'art-de-la-table'
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO categories (name, slug, parent_id) 
SELECT 'Bol et Saladiers', 'bol-saladiers', id FROM categories WHERE slug = 'art-de-la-table'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- PRODUITS
INSERT INTO products (artisan_id, name, slug, description, price, stock, image_url, is_active) VALUES
-- Produits Céramique
((SELECT id FROM artisans WHERE business_name = 'Atelier Céramique Isabelle'), 'Vase Céramique Bleu', 'vase-ceramique-bleu', 'Magnifique vase en céramique émaillée bleu ciel, pièce unique façonnée à la main.', 45.00, 8, '/images/vase-bleu.jpg', TRUE),
((SELECT id FROM artisans WHERE business_name = 'Atelier Céramique Isabelle'), 'Assiette Décorative Floral', 'assiette-decorative-floral', 'Assiette en céramique avec motif floral peint à la main.', 28.00, 15, '/images/assiette-floral.jpg', TRUE),
((SELECT id FROM artisans WHERE business_name = 'Atelier Céramique Isabelle'), 'Bol Céramique Rustique', 'bol-ceramique-rustique', 'Bol en terre cuite avec finition naturelle.', 22.00, 20, '/images/bol-rustique.jpg', TRUE),
-- Produits Bois
((SELECT id FROM artisans WHERE business_name = 'Menuiserie Artisanale Marc'), 'Table Basse Chêne Massif', 'table-basse-chene-massif', 'Table basse en chêne massif, design moderne. Dimensions 120x60cm.', 450.00, 3, '/images/table-chene.jpg', TRUE),
((SELECT id FROM artisans WHERE business_name = 'Menuiserie Artisanale Marc'), 'Chaise Design en Hêtre', 'chaise-design-hetre', 'Chaise en hêtre massif avec assise en cuir.', 180.00, 6, '/images/chaise-hetre.jpg', TRUE),
-- Produits Textile
((SELECT id FROM artisans WHERE business_name = 'Tissages de Claire'), 'Écharpe Laine Mérinos', 'echarpe-laine-merinos', 'Écharpe en laine mérinos ultra-douce, tissée à la main.', 55.00, 15, '/images/echarpe-merinos.jpg', TRUE),
((SELECT id FROM artisans WHERE business_name = 'Tissages de Claire'), 'Coussin Décoratif Brodé', 'coussin-decoratif-brode', 'Coussin carré 40x40cm en coton bio avec broderie artisanale.', 42.00, 20, '/images/coussin-brode.jpg', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- RELATIONS PRODUIT-CATÉGORIE
INSERT INTO product_categories (product_id, category_id) VALUES
((SELECT id FROM products WHERE slug = 'vase-ceramique-bleu'), (SELECT id FROM categories WHERE slug = 'vases-pots')),
((SELECT id FROM products WHERE slug = 'assiette-decorative-floral'), (SELECT id FROM categories WHERE slug = 'assiettes')),
((SELECT id FROM products WHERE slug = 'bol-ceramique-rustique'), (SELECT id FROM categories WHERE slug = 'bol-saladiers')),
((SELECT id FROM products WHERE slug = 'table-basse-chene-massif'), (SELECT id FROM categories WHERE slug = 'tables')),
((SELECT id FROM products WHERE slug = 'chaise-design-hetre'), (SELECT id FROM categories WHERE slug = 'chaises')),
((SELECT id FROM products WHERE slug = 'echarpe-laine-merinos'), (SELECT id FROM categories WHERE slug = 'echarpes')),
((SELECT id FROM products WHERE slug = 'coussin-decoratif-brode'), (SELECT id FROM categories WHERE slug = 'decoration'));

-- AVIS
INSERT INTO reviews (user_id, product_id, rating, comment) VALUES
((SELECT id FROM users WHERE email = 'marie.dupont@email.com'), (SELECT id FROM products WHERE slug = 'vase-ceramique-bleu'), 5, 'Magnifique vase, qualité exceptionnelle !'),
((SELECT id FROM users WHERE email = 'jean.martin@email.com'), (SELECT id FROM products WHERE slug = 'table-basse-chene-massif'), 5, 'Table superbe, travail de qualité.'),
((SELECT id FROM users WHERE email = 'sophie.bernard@email.com'), (SELECT id FROM products WHERE slug = 'echarpe-laine-merinos'), 5, 'Écharpe très douce et chaude. Parfaite !')
ON DUPLICATE KEY UPDATE comment = VALUES(comment);

-- FAVORIS
INSERT INTO favorites (user_id, product_id) VALUES
((SELECT id FROM users WHERE email = 'marie.dupont@email.com'), (SELECT id FROM products WHERE slug = 'table-basse-chene-massif')),
((SELECT id FROM users WHERE email = 'jean.martin@email.com'), (SELECT id FROM products WHERE slug = 'chaise-design-hetre')),
((SELECT id FROM users WHERE email = 'sophie.bernard@email.com'), (SELECT id FROM products WHERE slug = 'coussin-decoratif-brode'))
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);
*/

-- ============================================
-- FIN DU SCRIPT
-- ============================================

SELECT 'Base de données créée avec succès !' as message;
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM categories) as total_categories,
    (SELECT COUNT(*) FROM artisans) as total_artisans,
    (SELECT COUNT(*) FROM conversations) as total_conversations;

