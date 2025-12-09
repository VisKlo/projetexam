import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { markPageNotificationsAsRead } from '../utils/notificationUtils';
import apiClient, { getErrorMessage } from '../utils/apiClient';
import { getImageUrl } from '../config';
import { formatDateShort, formatDateTime } from '../utils/dateUtils';
import { formatPrice } from '../utils/priceUtils';
import './AdminDashboard.scss';

const AdminDashboard = () => {
  const { isAdmin, user } = useAuth();
  const { showSuccess, showError, confirm } = useNotification();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');
  const [editingOrder, setEditingOrder] = useState(null);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      // Marquer les notifications d'avis comme lues (les commandes sont maintenant des messages automatiques)
      markPageNotificationsAsRead('admin');
    }
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [statsRes, usersRes, ordersRes, reviewsRes, productsRes] = await Promise.all([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/users'),
        apiClient.get('/admin/orders'),
        apiClient.get('/admin/reviews'),
        apiClient.get('/admin/products')
      ]);
      setStats(statsRes.data.general);
      setUsers(usersRes.data.users || []);
      setOrders(ordersRes.data.orders || []);
      setReviews(reviewsRes.data.reviews || []);
      setProducts(productsRes.data.products || []);
    } catch (error) {
      console.error('Erreur récupération données:', error);
      showError(getErrorMessage(error, 'Erreur lors du chargement des données'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'En attente',
      'paid': 'Payé',
      'preparing': 'En préparation',
      'shipped': 'Expédié',
      'delivered': 'Livré',
      'cancelled': 'Annulé'
    };
    return labels[status] || status;
  };

  const getPaymentStatusLabel = (status) => {
    const labels = {
      'paid': 'Payé',
      'pending': 'En attente',
      'failed': 'Échoué',
      'refunded': 'Remboursé'
    };
    return labels[status] || status;
  };

  const handleDeleteUser = (userId, userEmail) => {
    if (userId === user?.id) {
      showError('Vous ne pouvez pas supprimer votre propre compte');
      return;
    }
    confirm({
      title: 'Supprimer l\'utilisateur ?',
      message: `Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur "${userEmail}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/admin/users/${userId}`);
          showSuccess('Utilisateur supprimé avec succès');
          fetchData();
        } catch (error) {
          const errorMsg = error.response?.data?.error || 'Erreur lors de la suppression';
          const errorDetails = error.response?.data?.details;
          showError(errorDetails ? `${errorMsg}\n${errorDetails}` : errorMsg);
        }
      }
    });
  };

  const handleChangeUserRole = async (userId, newRole) => {
    if (userId === user?.id) {
      showError('Vous ne pouvez pas modifier votre propre rôle');
      return;
    }
    try {
      await apiClient.put(`/admin/users/${userId}/role`, { role: newRole });
      const roleLabels = { 'client': 'Client', 'artisan': 'Artisan', 'admin': 'Administrateur' };
      showSuccess(`Rôle de l'utilisateur mis à jour à "${roleLabels[newRole] || newRole}"`);
      fetchData();
    } catch (error) {
      showError(getErrorMessage(error, 'Erreur lors de la modification du rôle'));
    }
  };

  const handleDeleteReview = (reviewId, userName) => {
    confirm({
      title: 'Supprimer l\'avis ?',
      message: `Êtes-vous sûr de vouloir supprimer l'avis de "${userName}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/admin/reviews/${reviewId}`);
          showSuccess('Avis supprimé avec succès');
          fetchData();
        } catch (error) {
          showError(getErrorMessage(error, 'Erreur lors de la suppression'));
        }
      }
    });
  };

  const handleToggleFeatured = async (productId, currentFeatured) => {
    try {
      await apiClient.put(`/products/${productId}`, {
        is_featured: !currentFeatured
      });
      showSuccess(`Produit ${!currentFeatured ? 'mis en vedette' : 'retiré de la vedette'} avec succès`);
      fetchData();
    } catch (error) {
      showError(getErrorMessage(error, 'Erreur lors de la modification'));
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await apiClient.put(`/orders/${orderId}/status`, { status });
      showSuccess('Statut de la commande mis à jour avec succès');
      setEditingOrder(null);
      fetchData();
    } catch (error) {
      showError(getErrorMessage(error, 'Erreur lors de la mise à jour'));
    }
  };

  const startEditingOrder = (order) => {
    setEditingOrder(order.id);
  };

  const cancelEditingOrder = () => {
    setEditingOrder(null);
  };

  const handleDeleteProduct = (productId, productName) => {
    confirm({
      title: 'Supprimer le produit ?',
      message: `Êtes-vous sûr de vouloir supprimer définitivement le produit "${productName}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/admin/products/${productId}`);
          showSuccess('Produit supprimé avec succès');
          fetchData();
        } catch (error) {
          const errorMsg = error.response?.data?.error || 'Erreur lors de la suppression';
          const errorDetails = error.response?.data?.details;
          showError(errorDetails ? `${errorMsg}\n${errorDetails}` : errorMsg);
        }
      }
    });
  };

  if (!isAdmin) {
    return (
      <div className="admin-dashboard">
        <div className="error-message">
          <span className="error-icon">🚫</span>
          <div>
            <h2>Accès refusé</h2>
            <p>Cette page est réservée aux administrateurs.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-container">
          <div className="loading-spinner" aria-label="Chargement"></div>
          <p>Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Tableau de bord Administrateur</h1>
        <p className="admin-subtitle">Gestion complète de la plateforme</p>
      </div>

      {/* Navigation par onglets */}
      <div className="admin-tabs" role="tablist" aria-label="Navigation principale">
        <button
          role="tab"
          aria-selected={activeTab === 'stats'}
          aria-controls="stats-panel"
          id="stats-tab"
          className={`admin-tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <span className="tab-icon">📊</span>
          <span>Statistiques</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'users'}
          aria-controls="users-panel"
          id="users-tab"
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span className="tab-icon">👥</span>
          <span>Utilisateurs</span>
          {users.length > 0 && <span className="tab-badge">{users.length}</span>}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'orders'}
          aria-controls="orders-panel"
          id="orders-tab"
          className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span className="tab-icon">📦</span>
          <span>Commandes</span>
          {orders.length > 0 && <span className="tab-badge">{orders.length}</span>}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'reviews'}
          aria-controls="reviews-panel"
          id="reviews-tab"
          className={`admin-tab ${activeTab === 'reviews' ? 'active' : ''}`}
          onClick={() => setActiveTab('reviews')}
        >
          <span className="tab-icon">⭐</span>
          <span>Avis</span>
          {reviews.length > 0 && <span className="tab-badge">{reviews.length}</span>}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'products'}
          aria-controls="products-panel"
          id="products-tab"
          className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <span className="tab-icon">🛍️</span>
          <span>Produits</span>
          {products.length > 0 && <span className="tab-badge">{products.length}</span>}
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'stats' && stats && (
        <div role="tabpanel" id="stats-panel" aria-labelledby="stats-tab" className="admin-panel">
          <div className="stats-grid">
            <div className="stat-card stat-card-primary">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <h3>Utilisateurs</h3>
                <p className="stat-value">{stats.total_users}</p>
                <p className="stat-detail">
                  <span>Clients: {stats.total_clients}</span>
                  <span>Artisans: {stats.total_artisans}</span>
                </p>
              </div>
            </div>
            
            <div className="stat-card stat-card-success">
              <div className="stat-icon">🛍️</div>
              <div className="stat-content">
                <h3>Produits</h3>
                <p className="stat-value">{stats.total_products}</p>
                <p className="stat-detail">Produits actifs</p>
              </div>
            </div>
            
            <div className="stat-card stat-card-warning">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>Commandes</h3>
                <p className="stat-value">{stats.total_orders}</p>
                <p className="stat-detail">
                  <span>En attente: {stats.pending_orders}</span>
                  <span>Payées: {stats.paid_orders || 0}</span>
                </p>
              </div>
            </div>
            
            <div className="stat-card stat-card-info">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <h3>Revenus</h3>
                <p className="stat-value">{formatPrice(stats.total_revenue)}</p>
                <p className="stat-detail">Total des ventes</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div role="tabpanel" id="users-panel" aria-labelledby="users-tab" className="admin-panel">
          <div className="panel-header">
            <h2>Gestion des Utilisateurs</h2>
            <p className="panel-subtitle">{users.length} utilisateur{users.length > 1 ? 's' : ''} enregistré{users.length > 1 ? 's' : ''}</p>
          </div>
          
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nom complet</th>
                  <th>Email</th>
                  <th>Rôle</th>
                  <th>Dernière connexion</th>
                  <th>Date d'inscription</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      <div className="empty-icon">👥</div>
                      <p>Aucun utilisateur trouvé</p>
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className={u.id === user?.id ? 'current-user' : ''}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            {u.first_name?.charAt(0)}{u.last_name?.charAt(0)}
                          </div>
                          <div>
                            <strong>{u.first_name} {u.last_name}</strong>
                            {u.id === user?.id && <span className="you-badge">(Vous)</span>}
                          </div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        {u.id === user?.id ? (
                          <span className="role-badge role-current">{u.role === 'client' ? 'Client' : u.role === 'artisan' ? 'Artisan' : 'Administrateur'}</span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                            className="role-select"
                            aria-label={`Modifier le rôle de ${u.first_name} ${u.last_name}`}
                          >
                            <option value="client">Client</option>
                            <option value="artisan">Artisan</option>
                            <option value="admin">Administrateur</option>
                          </select>
                        )}
                      </td>
                      <td>
                        {u.last_login 
                          ? formatDateTime(u.last_login)
                          : <span className="never-connected">Jamais connecté</span>}
                      </td>
                      <td>{formatDateShort(u.created_at)}</td>
                      <td>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="btn-danger btn-sm"
                            aria-label={`Supprimer l'utilisateur ${u.email}`}
                          >
                            🗑️ Supprimer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div role="tabpanel" id="orders-panel" aria-labelledby="orders-tab" className="admin-panel">
          <div className="panel-header">
            <h2>Gestion des Commandes</h2>
            <p className="panel-subtitle">{orders.length} commande{orders.length > 1 ? 's' : ''} au total</p>
          </div>
          
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>N° Commande</th>
                  <th>Client</th>
                  <th>Total</th>
                  <th>Statut</th>
                  <th>Paiement</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      <div className="empty-icon">📦</div>
                      <p>Aucune commande trouvée</p>
                    </td>
                  </tr>
                ) : (
                  orders.map(order => (
                    <tr key={order.id}>
                      <td>
                        <strong className="order-number">#{order.order_number}</strong>
                      </td>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar-small">
                            {order.first_name?.charAt(0)}{order.last_name?.charAt(0)}
                          </div>
                          <div>
                            {order.first_name} {order.last_name}
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong className="order-total">{formatPrice(order.total)}</strong>
                      </td>
                      <td>
                        {editingOrder === order.id ? (
                          <div className="order-status-edit">
                            <select
                              value={order.status}
                              onChange={(e) => {
                                const newStatus = e.target.value;
                                handleUpdateOrderStatus(order.id, newStatus);
                              }}
                              className="status-select"
                            >
                              <option value="pending">En attente</option>
                              <option value="paid">Payé</option>
                              <option value="preparing">En préparation</option>
                              <option value="shipped">Expédié</option>
                              <option value="delivered">Livré</option>
                              <option value="cancelled">Annulé</option>
                            </select>
                            <div className="edit-actions">
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, order.status)}
                                className="btn-success btn-icon"
                                aria-label="Enregistrer"
                              >
                                ✓
                              </button>
                              <button
                                onClick={cancelEditingOrder}
                                className="btn-secondary btn-icon"
                                aria-label="Annuler"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="status-cell">
                            <span className={`status-badge status-${order.status}`}>
                              {getStatusLabel(order.status)}
                            </span>
                            <button
                              onClick={() => startEditingOrder(order)}
                              className="btn-edit btn-sm"
                              aria-label="Modifier le statut"
                            >
                              ✏️
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`payment-badge payment-${order.payment_status}`}>
                          {getPaymentStatusLabel(order.payment_status)}
                        </span>
                      </td>
                      <td>{formatDateShort(order.created_at)}</td>
                      <td>
                        {order.tracking_number && (
                          <div className="tracking-info">
                            <span className="tracking-label">Suivi:</span>
                            <span className="tracking-number">{order.tracking_number}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div role="tabpanel" id="reviews-panel" aria-labelledby="reviews-tab" className="admin-panel">
          <div className="panel-header">
            <h2>Gestion des Avis</h2>
            <p className="panel-subtitle">{reviews.length} avis au total</p>
          </div>
          
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Utilisateur</th>
                  <th>Note</th>
                  <th>Commentaire</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      <div className="empty-icon">⭐</div>
                      <p>Aucun avis trouvé</p>
                    </td>
                  </tr>
                ) : (
                  reviews.map(review => (
                    <tr key={review.id}>
                      <td>
                        <div className="product-info">
                          {review.product_image && (
                            <img src={getImageUrl(review.product_image)} alt={review.product_name} className="product-thumbnail" loading="lazy" />
                          )}
                          <span>{review.product_name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar-small">
                            {review.first_name?.charAt(0)}{review.last_name?.charAt(0)}
                          </div>
                          <div>
                            {review.first_name} {review.last_name}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="rating-display">
                          <span className="rating-stars">{'⭐'.repeat(review.rating)}</span>
                          <span className="rating-value">({review.rating}/5)</span>
                        </div>
                      </td>
                      <td className="comment-cell">
                        {review.comment || <span className="no-comment">(Aucun commentaire)</span>}
                      </td>
                      <td>{formatDateShort(review.created_at)}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteReview(review.id, `${review.first_name} ${review.last_name}`)}
                          className="btn-danger btn-sm"
                          aria-label={`Supprimer l'avis de ${review.first_name} ${review.last_name}`}
                        >
                          🗑️ Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div role="tabpanel" id="products-panel" aria-labelledby="products-tab" className="admin-panel">
          <div className="panel-header">
            <h2>Gestion des Produits</h2>
            <p className="panel-subtitle">{products.length} produit{products.length > 1 ? 's' : ''} au total</p>
          </div>
          
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Artisan</th>
                  <th>Prix</th>
                  <th>Stock</th>
                  <th>Note</th>
                  <th>Statut</th>
                  <th>En vedette</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="empty-state">
                      <div className="empty-icon">🛍️</div>
                      <p>Aucun produit trouvé</p>
                    </td>
                  </tr>
                ) : (
                  products.map(product => (
                    <tr key={product.id}>
                      <td>
                        <div className="product-info">
                          {product.image_url && (
                            <img src={getImageUrl(product.image_url)} alt={product.name} className="product-thumbnail" loading="lazy" />
                          )}
                          <span>{product.name}</span>
                        </div>
                      </td>
                      <td>{product.artisan_name}</td>
                      <td>
                        <strong>{formatPrice(product.price)}</strong>
                      </td>
                      <td>
                        <span className={`stock-badge ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td>
                        {product.average_rating > 0 ? (
                          <div className="rating-display">
                            <span className="rating-stars">⭐</span>
                            <span className="rating-value">
                              {parseFloat(product.average_rating).toFixed(1)} ({product.review_count})
                            </span>
                          </div>
                        ) : (
                          <span className="no-rating">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-badge status-${product.is_active ? 'active' : 'inactive'}`}>
                          {product.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleFeatured(product.id, product.is_featured)}
                          className={`btn-sm ${product.is_featured ? 'btn-success' : 'btn-secondary'}`}
                          aria-label={`${product.is_featured ? 'Retirer de la vedette' : 'Mettre en vedette'} le produit ${product.name}`}
                          title={product.is_featured ? 'Retirer de la page d\'accueil' : 'Afficher sur la page d\'accueil'}
                        >
                          {product.is_featured ? '⭐ En vedette' : 'Mettre en vedette'}
                        </button>
                      </td>
                      <td>{formatDateShort(product.created_at)}</td>
                      <td>
                        <button
                          onClick={() => handleDeleteProduct(product.id, product.name)}
                          className="btn-danger btn-sm"
                          aria-label={`Supprimer le produit ${product.name}`}
                        >
                          🗑️ Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
