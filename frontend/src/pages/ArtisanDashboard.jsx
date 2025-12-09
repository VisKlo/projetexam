import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { markPageNotificationsAsRead } from '../utils/notificationUtils';
import { useNavigate } from 'react-router-dom';
import apiClient, { getErrorMessage } from '../utils/apiClient';
import { formatDateShort } from '../utils/dateUtils';
import { formatPrice } from '../utils/priceUtils';
import './ArtisanDashboard.scss';

const ArtisanDashboard = () => {
  const { isArtisan, user } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    images: [],
    videos: [],
    categories: []
  });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (isArtisan) {
      fetchData();
    }
  }, [isArtisan]);

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes, categoriesRes] = await Promise.all([
        apiClient.get('/products/my-products'),
        apiClient.get('/orders/received'),
        apiClient.get('/categories')
      ]);
      setProducts(productsRes.data.products || []);
      setOrders(ordersRes.data.orders || []);
      setCategories(categoriesRes.data.flat || []);
    } catch (error) {
      console.error('Erreur récupération données:', error);
      showError(getErrorMessage(error, 'Erreur lors du chargement des données'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (product) => {
    try {
      const response = await apiClient.get(`/products/${product.id}`);
      const fullProduct = response.data.product;
      
      setEditingProduct(fullProduct);
      setProductForm({
        name: fullProduct.name || '',
        description: fullProduct.description || '',
        price: fullProduct.price || '',
        stock: fullProduct.stock || '',
        images: [],
        videos: [],
        categories: fullProduct.categories ? fullProduct.categories.map(c => c.id || c) : []
      });
      setShowProductForm(true);
    } catch (error) {
      showError(getErrorMessage(error, 'Erreur lors du chargement du produit'));
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setShowProductForm(false);
    setProductForm({ name: '', description: '', price: '', stock: '', images: [], videos: [], categories: [] });
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      // Créer FormData pour envoyer les fichiers
      const formData = new FormData();
      formData.append('name', productForm.name);
      formData.append('description', productForm.description);
      formData.append('price', productForm.price);
      formData.append('stock', productForm.stock);
      
      if (productForm.images && productForm.images.length > 0) {
        productForm.images.forEach((image, index) => {
          formData.append(`images[${index}]`, image);
        });
      }
      
      if (productForm.videos && productForm.videos.length > 0) {
        productForm.videos.forEach((video, index) => {
          formData.append(`videos[${index}]`, video);
        });
      }
      
      if (productForm.categories && productForm.categories.length > 0) {
        // Envoyer chaque catégorie individuellement
        productForm.categories.forEach(catId => {
          formData.append('categories[]', catId);
        });
      }

      let response;
      if (editingProduct) {
        response = await apiClient.put(`/products/${editingProduct.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        showSuccess(response.data.message || 'Produit mis à jour avec succès !');
      } else {
        response = await apiClient.post('/products', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        showSuccess(response.data.message || 'Produit créé avec succès !');
      }
      
      handleCancelEdit();
      fetchData();
    } catch (error) {
      showError(getErrorMessage(error, editingProduct ? 'Erreur lors de la mise à jour du produit' : 'Erreur lors de la création du produit'));
    }
  };

  const handleShipOrder = async (orderId) => {
    try {
      await apiClient.put(`/orders/${orderId}/ship`, { status: 'shipped' });
      showSuccess('Commande marquée comme expédiée avec succès');
      fetchData();
    } catch (error) {
      showError(error.response?.data?.error || 'Erreur lors de la mise à jour');
    }
  };

  const handleToggleProductStatus = async (productId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await apiClient.put(`/products/${productId}`, {
        is_active: newStatus
      });
      showSuccess(`Produit ${newStatus ? 'activé' : 'désactivé'} avec succès`);
      fetchData();
    } catch (error) {
      showError(getErrorMessage(error, 'Erreur lors de la modification du statut'));
    }
  };


  if (!isArtisan) {
    return <div className="error">Accès réservé aux artisans</div>;
  }

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="artisan-dashboard">
      <div className="dashboard-header">
        <h1>Tableau de bord Artisan</h1>
        <button onClick={() => {
          if (showProductForm) {
            handleCancelEdit();
          } else {
            setShowProductForm(true);
          }
        }} className="btn-primary">
          {showProductForm ? 'Annuler' : '+ Nouveau produit'}
        </button>
      </div>

      {showProductForm && (
        <form onSubmit={handleCreateProduct} className="product-form">
          <h2>{editingProduct ? 'Modifier le produit' : 'Créer un produit'}</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Nom</label>
              <input
                type="text"
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Prix (€)</label>
              <input
                type="number"
                step="0.01"
                value={productForm.price}
                onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              required
              rows="4"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Stock</label>
              <input
                type="number"
                value={productForm.stock}
                onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Images (plusieurs possibles)</label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const validFiles = [];
                  for (const file of files) {
                    if (file.size > 5 * 1024 * 1024) {
                      showError(`L'image "${file.name}" est trop grande. Taille maximale : 5MB`);
                      continue;
                    }
                    validFiles.push(file);
                  }
                  if (validFiles.length > 0) {
                    setProductForm({ 
                      ...productForm, 
                      images: [...(productForm.images || []), ...validFiles]
                    });
                  }
                  e.target.value = '';
                }}
              />
              {productForm.images && productForm.images.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  {productForm.images.map((image, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '5px',
                      marginBottom: '5px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px'
                    }}>
                      <span style={{ fontSize: '0.9em', color: '#666' }}>
                        📷 {image.name} ({(image.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newImages = [...productForm.images];
                          newImages.splice(index, 1);
                          setProductForm({ ...productForm, images: newImages });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d32f2f',
                          cursor: 'pointer',
                          fontSize: '1.2em',
                          padding: '0 5px'
                        }}
                        aria-label="Supprimer cette image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Vidéos (plusieurs possibles)</label>
              <input
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const validFiles = [];
                  for (const file of files) {
                    // Vérifier la taille (50MB max)
                    if (file.size > 50 * 1024 * 1024) {
                      showError(`La vidéo "${file.name}" est trop grande. Taille maximale : 50MB`);
                      continue;
                    }
                    validFiles.push(file);
                  }
                  if (validFiles.length > 0) {
                    setProductForm({ 
                      ...productForm, 
                      videos: [...(productForm.videos || []), ...validFiles]
                    });
                  }
                  e.target.value = '';
                }}
              />
              {productForm.videos && productForm.videos.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                  {productForm.videos.map((video, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      padding: '5px',
                      marginBottom: '5px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '4px'
                    }}>
                      <span style={{ fontSize: '0.9em', color: '#666' }}>
                        🎥 {video.name} ({(video.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const newVideos = [...productForm.videos];
                          newVideos.splice(index, 1);
                          setProductForm({ ...productForm, videos: newVideos });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#d32f2f',
                          cursor: 'pointer',
                          fontSize: '1.2em',
                          padding: '0 5px'
                        }}
                        aria-label="Supprimer cette vidéo"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
                Formats acceptés : MP4, WebM, OGG, MOV, AVI. Taille maximale : 50MB par vidéo.
              </small>
            </div>
          </div>
          <div className="form-group">
            <label>Catégories</label>
            <select
              multiple
              value={productForm.categories}
              onChange={(e) => {
                const selectedCategories = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                setProductForm({ ...productForm, categories: selectedCategories });
              }}
              style={{ minHeight: '100px' }}
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
              Maintenez Ctrl (ou Cmd sur Mac) pour sélectionner plusieurs catégories
            </small>
            {editingProduct && editingProduct.media && editingProduct.media.length > 0 && (
              <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                <strong>Médias existants ({editingProduct.media.length}) :</strong>
                <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {editingProduct.media.map((media, index) => (
                    <div key={media.id || index} style={{ fontSize: '0.9em', padding: '5px', backgroundColor: '#fff', borderRadius: '4px' }}>
                      {media.media_type === 'image' ? '📷' : '🎥'} {media.media_type === 'image' ? 'Image' : 'Vidéo'}
                    </div>
                  ))}
                </div>
                <small style={{ display: 'block', marginTop: '10px', color: '#666' }}>
                  Les nouveaux médias ajoutés seront ajoutés aux médias existants.
                </small>
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary">
            {editingProduct ? 'Mettre à jour le produit' : 'Créer le produit'}
          </button>
        </form>
      )}

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2>Mes Produits ({products.length})</h2>
          {products.length === 0 ? (
            <p>Aucun produit créé pour le moment.</p>
          ) : (
            <div className="products-list">
              {products.map(product => (
                <div key={product.id} className="product-item" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  backgroundColor: product.is_active ? '#fff' : '#f5f5f5'
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 5px 0' }}>{product.name}</h3>
                    <p style={{ margin: '5px 0', color: '#666' }}>
                      {formatPrice(product.price)} - Stock: {product.stock}
                    </p>
                    {product.description && (
                      <p style={{ margin: '5px 0', fontSize: '0.9em', color: '#888' }}>
                        {product.description.length > 100 
                          ? product.description.substring(0, 100) + '...' 
                          : product.description}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`status-badge ${product.is_active ? 'active' : 'inactive'}`} style={{
                      padding: '5px 10px',
                      borderRadius: '4px',
                      fontSize: '0.9em',
                      fontWeight: 'bold',
                      backgroundColor: product.is_active ? '#28a745' : '#6c757d',
                      color: '#fff'
                    }}>
                      {product.is_active ? 'Actif' : 'Inactif'}
                    </span>
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="btn-secondary"
                      style={{
                        padding: '5px 15px',
                        fontSize: '0.9em',
                        backgroundColor: '#007bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Modifier
                    </button>
                    <button
                      onClick={() => handleToggleProductStatus(product.id, product.is_active)}
                      className="btn-secondary"
                      style={{
                        padding: '5px 15px',
                        fontSize: '0.9em',
                        backgroundColor: product.is_active ? '#ffc107' : '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {product.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <h2>Commandes Reçues ({orders.length})</h2>
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-item">
                <div>
                  <h3>Commande #{order.order_number}</h3>
                  <p>Total: {formatPrice(order.total)}</p>
                  <p>Date: {formatDateShort(order.created_at)}</p>
                  {order.first_name && order.last_name && order.client_id && (
                    <p style={{ marginTop: '5px' }}>
                      <span 
                        onClick={async () => {
                          try {
                            const response = await apiClient.post('/messages/conversations', {
                              client_id: order.client_id,
                              order_id: order.id
                            });
                            navigate('/messages');
                          } catch (error) {
                            if (error.response?.status === 403) {
                              navigate('/messages');
                            } else {
                              showError(getErrorMessage(error, 'Erreur lors de la création de la conversation'));
                            }
                          }
                        }}
                        style={{ 
                          color: '#667eea', 
                          cursor: 'pointer', 
                          textDecoration: 'underline',
                          fontSize: '0.95em',
                          fontWeight: '500'
                        }}
                      >
                        Client: {order.first_name} {order.last_name} 💬
                      </span>
                    </p>
                  )}
                  {order.shipping_address && (
                    <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                      <strong>Adresse:</strong> {order.shipping_address}
                    </p>
                  )}
                  {order.shipping_phone && (
                    <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                      <strong>Téléphone:</strong> {order.shipping_phone}
                    </p>
                  )}
                </div>
                <div className="order-actions">
                  <span className={`status-badge status-${order.status}`} style={{
                    padding: '5px 10px',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    fontWeight: 'bold',
                    backgroundColor: order.status === 'paid' ? '#28a745' : order.status === 'preparing' ? '#ffc107' : order.status === 'shipped' ? '#17a2b8' : order.status === 'delivered' ? '#6c757d' : '#dc3545',
                    color: '#fff',
                    marginRight: '10px'
                  }}>
                    {order.status === 'pending' && 'En attente'}
                    {order.status === 'paid' && 'Payé'}
                    {order.status === 'preparing' && 'En préparation'}
                    {order.status === 'shipped' && 'Expédié'}
                    {order.status === 'delivered' && 'Livré'}
                    {order.status === 'cancelled' && 'Annulé'}
                  </span>
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => handleShipOrder(order.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#17a2b8',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.9em',
                        fontWeight: 'bold'
                      }}
                    >
                      📦 Marquer comme expédié
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ArtisanDashboard;

