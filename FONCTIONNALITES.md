# Fonctionnalités - Artisashop

Documentation complète de toutes les fonctionnalités de la plateforme e-commerce Artisashop.

## 🎯 Vue d'ensemble

Artisashop est une plateforme e-commerce complète pour la vente de produits artisanaux, avec trois types d'utilisateurs : **Clients**, **Artisans** et **Administrateurs**.

---

## 👤 Fonctionnalités Visiteurs (non connectés)

### Navigation
- ✅ Consultation du catalogue de produits
- ✅ Recherche de produits par nom ou description
- ✅ Filtrage par catégorie
- ✅ Filtrage par prix (min/max)
- ✅ Affichage des produits en vedette sur la page d'accueil
- ✅ Consultation des détails d'un produit (images, vidéos, description, avis)

### Compte
- ✅ Création de compte (inscription)
- ✅ Connexion au compte

---

## 🛒 Fonctionnalités Clients

### Gestion du compte
- ✅ Modification du profil (nom, prénom, email, téléphone, adresse)
- ✅ Validation en temps réel des champs (email, téléphone français)
- ✅ Affichage des informations personnelles

### Catalogue et recherche
- ✅ Consultation de tous les produits
- ✅ Recherche avancée
- ✅ Filtrage par catégorie et prix
- ✅ Affichage des produits en vedette

### Panier
- ✅ Ajout de produits au panier
- ✅ Modification des quantités
- ✅ Suppression d'articles
- ✅ Calcul automatique du sous-total, frais de livraison et total
- ✅ Persistance du panier (sauvegarde en base de données)

### Commandes
- ✅ Passage de commande avec tunnel de paiement
- ✅ Saisie de l'adresse de livraison (pré-remplie depuis le profil)
- ✅ Validation du numéro de téléphone (format français)
- ✅ Paiement sécurisé via Stripe
- ✅ Suivi des commandes (statut : en attente, payée, en préparation, expédiée, livrée, annulée)
- ✅ Consultation de l'historique des commandes
- ✅ Détails de chaque commande (articles, prix, statut)

### Favoris
- ✅ Ajout de produits aux favoris
- ✅ Retrait de produits des favoris
- ✅ Consultation de la liste des favoris

### Avis et notes
- ✅ Consultation des avis des autres clients
- ✅ Publication d'un avis (note de 1 à 5 étoiles + commentaire)
- ✅ Condition : avoir acheté le produit
- ✅ Affichage de la note moyenne et du nombre d'avis

### Messagerie
- ✅ Contact direct avec les artisans depuis la fiche produit
- ✅ Création automatique de conversation si elle n'existe pas
- ✅ Réutilisation des conversations existantes
- ✅ Envoi et réception de messages
- ✅ Liste des conversations
- ✅ Suppression de conversations
- ✅ Notifications pour les nouveaux messages
- ✅ Messages automatiques du système pour les changements de statut de commande
- ✅ Conversations système séparées (non modifiables par l'utilisateur)

### Notifications
- ✅ Centre de notifications avec cloche
- ✅ Compteur de notifications non lues
- ✅ Affichage des notifications dans un dropdown
- ✅ Marquage des notifications comme lues
- ✅ Marquage de toutes les notifications comme lues
- ✅ Redirection vers la page concernée au clic sur une notification

---

## 🎨 Fonctionnalités Artisans

### Dashboard
- ✅ Vue d'ensemble des produits
- ✅ Vue d'ensemble des commandes reçues
- ✅ Statistiques de base

### Gestion des produits
- ✅ Création de produits avec :
  - Nom, description, prix, stock
  - **Plusieurs images** (upload multiple, max 5MB par image)
  - **Plusieurs vidéos** (upload multiple, max 50MB par vidéo)
  - Sélection de catégories (plusieurs catégories possibles)
- ✅ Modification de produits existants
- ✅ Ajout de nouveaux médias aux produits existants
- ✅ Activation/désactivation de produits
- ✅ Suppression de produits

### Gestion des commandes
- ✅ Consultation des commandes reçues
- ✅ Mise à jour du statut des commandes (en préparation, expédiée)
- ✅ Notifications automatiques lors de nouvelles commandes (via messages système)
- ✅ Messages automatiques envoyés aux clients lors des changements de statut

### Messagerie
- ✅ Réception et envoi de messages avec les clients
- ✅ Notifications pour les nouveaux messages
- ✅ Conversations avec les clients

### Réponses aux avis
- ✅ Consultation des avis laissés sur leurs produits
- ✅ Réponse aux avis clients
- ✅ Affichage des réponses dans la fiche produit

---

## 👑 Fonctionnalités Administrateurs

### Dashboard
- ✅ Vue d'ensemble avec statistiques :
  - Nombre total d'utilisateurs
  - Nombre total de produits
  - Nombre total de commandes
  - Chiffre d'affaires total
- ✅ Interface moderne avec onglets

### Gestion des produits
- ✅ Consultation de tous les produits
- ✅ **Mise en vedette de produits** (affichage sur la page d'accueil)
- ✅ Activation/désactivation de produits
- ✅ Modification de tous les produits (y compris ceux des artisans)

### Gestion des commandes
- ✅ Consultation de toutes les commandes
- ✅ Modification du statut des commandes
- ✅ Consultation des détails des commandes
- ✅ Filtrage par statut

### Gestion des utilisateurs
- ✅ Consultation de tous les utilisateurs
- ✅ Activation/désactivation d'utilisateurs
- ✅ Consultation des profils

### Gestion des catégories
- ✅ Consultation des catégories
- ✅ Création de catégories (via l'interface ou directement en base)

---

## 🔧 Fonctionnalités techniques

### Sécurité
- ✅ Authentification JWT
- ✅ Hashage des mots de passe (bcrypt)
- ✅ Protection CSRF (Helmet.js)
- ✅ Rate limiting (configurable)
- ✅ Validation des données (express-validator)
- ✅ Sanitization des entrées

### Performance
- ✅ Lazy loading des images
- ✅ Optimisation des requêtes SQL (index)
- ✅ Mise en cache des données statiques
- ✅ Compression des assets

### Responsive Design
- ✅ Design mobile-first
- ✅ Adaptation à toutes les tailles d'écran
- ✅ Navigation mobile avec menu hamburger

### Accessibilité
- ✅ Attributs ARIA
- ✅ Navigation au clavier
- ✅ Contraste des couleurs
- ✅ Labels pour les formulaires

### UX/UI
- ✅ Design moderne et professionnel
- ✅ Animations subtiles
- ✅ Feedback visuel (toasts, modals)
- ✅ Messages d'erreur clairs
- ✅ Validation en temps réel des formulaires

---

## 📱 Fonctionnalités spécifiques

### Médias produits
- ✅ Upload multiple d'images (JPEG, PNG, GIF, WebP)
- ✅ Upload multiple de vidéos (MP4, WebM, OGG, MOV, AVI)
- ✅ Galerie de médias dans la fiche produit
- ✅ Ordre d'affichage des médias
- ✅ Migration automatique des anciennes images vers le nouveau système

### Système de notifications
- ✅ Notifications en temps réel (polling)
- ✅ Notifications par type (messages, autres)
- ✅ Marquage automatique comme lues lors de la visite de la page concernée
- ✅ Centre de notifications avec dropdown

### Système de messages
- ✅ Conversations persistantes
- ✅ Réutilisation des conversations existantes
- ✅ Messages système automatiques
- ✅ Conversations système séparées
- ✅ Suppression de conversations (soft delete)
- ✅ Marquage des messages comme lus

### Paiement
- ✅ Intégration Stripe
- ✅ Paiement sécurisé
- ✅ Gestion des Payment Intents
- ✅ Confirmation de paiement
- ✅ Mise à jour automatique du statut de commande

---

## 🎨 Design et interface

### Thème
- ✅ Palette de couleurs moderne
- ✅ Typographie optimisée (Google Fonts)
- ✅ Espacements cohérents
- ✅ Ombres et effets visuels

### Composants
- ✅ Navbar responsive avec logo
- ✅ Footer avec copyright
- ✅ Modals pour les confirmations
- ✅ Toasts pour les notifications
- ✅ Formulaires stylisés
- ✅ Boutons avec états (hover, active, disabled)

---

## 📊 Base de données

### Tables principales
- `users` - Utilisateurs (clients, artisans, admins)
- `artisans` - Informations des artisans
- `products` - Produits
- `product_media` - Médias des produits (images/vidéos)
- `product_categories` - Relation produits-catégories
- `orders` - Commandes
- `order_items` - Articles de commande
- `payments` - Paiements
- `reviews` - Avis produits
- `favorites` - Favoris
- `notifications` - Notifications
- `conversations` - Conversations de messagerie
- `messages` - Messages
- `categories` - Catégories

### Triggers automatiques
- Génération automatique du numéro de commande
- Mise à jour automatique du stock après commande

---

## 🔄 Workflows

### Workflow de commande
1. Client ajoute des produits au panier
2. Client passe commande (checkout)
3. Client paie via Stripe
4. Commande créée avec statut "paid"
5. Artisan reçoit une notification (message système)
6. Artisan met la commande en "preparing"
7. Client reçoit un message système
8. Artisan expédie la commande
9. Client reçoit un message système
10. Commande livrée

### Workflow de création de produit
1. Artisan crée un produit avec images/vidéos
2. Produit sauvegardé avec médias
3. Admin peut mettre le produit en vedette
4. Produit apparaît sur la page d'accueil si en vedette

### Workflow de messagerie
1. Client contacte un artisan depuis une fiche produit
2. Conversation créée ou réutilisée
3. Messages échangés
4. Notifications envoyées aux deux parties
5. Messages marqués comme lus lors de l'ouverture

---

## 🚀 Technologies utilisées

- **Frontend** : React.js, React Router, Axios, Sass
- **Backend** : Node.js, Express.js, MySQL
- **Sécurité** : JWT, bcrypt, Helmet.js
- **Paiement** : Stripe
- **Base de données** : MySQL avec triggers et index optimisés

---

## 📝 Notes importantes

- Les mots de passe sont hashés avec bcrypt
- Les tokens JWT expirent après un certain temps
- Les fichiers uploadés sont stockés dans `backend/uploads/`
- Les notifications utilisent un système de polling (rafraîchissement automatique)
- Les messages système sont envoyés automatiquement pour les changements de statut de commande
- Les produits peuvent avoir plusieurs images et vidéos
- Les catégories peuvent être hiérarchiques (parent/enfant)

