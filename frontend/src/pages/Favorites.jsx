import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_URL, getImageUrl } from '../config';
import { formatPrice } from '../utils/priceUtils';
import './Favorites.scss';

const Favorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && ['client', 'artisan', 'admin'].includes(user.role)) {
      fetchFavorites();
    }
  }, [user]);

  const fetchFavorites = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/favorites`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setFavorites(response.data.favorites || []);
    } catch (error) {
      console.error('Erreur récupération favoris:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (productId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/favorites/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setFavorites(favorites.filter(f => f.id !== productId));
    } catch (error) {
      console.error('Erreur suppression favori:', error);
    }
  };

  if (!user || !['client', 'artisan', 'admin'].includes(user.role)) {
    return <div className="error">Accès réservé aux clients, artisans et admins</div>;
  }

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="favorites-page">
      <h1>Mes Favoris</h1>

      {favorites.length === 0 ? (
        <div className="no-favorites">
          <p>Aucun produit en favoris</p>
          <Link to="/products" className="btn-primary">Voir les produits</Link>
        </div>
      ) : (
        <div className="favorites-grid">
          {favorites.map(product => (
            <div key={product.id} className="product-card">
              <Link to={`/products/${product.id}`}>
                  <div className="product-image">
                    {(() => {
                      const firstImage = product.media && product.media.length > 0
                      ? product.media.find(m => m.media_type === 'image')
                      : null;
                    const imageUrl = firstImage ? firstImage.media_url : product.image_url;
                    
                    return imageUrl ? (
                      <img src={getImageUrl(imageUrl)} alt={product.name} />
                    ) : (
                      <div className="placeholder-image">📦</div>
                    );
                  })()}
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-price">{formatPrice(product.price)}</p>
                  <p className="product-artisan">{product.artisan_name}</p>
                </div>
              </Link>
              <button
                onClick={() => removeFavorite(product.id)}
                className="remove-favorite-btn"
              >
                Retirer des favoris
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;

