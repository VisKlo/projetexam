import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL, getImageUrl } from '../config';
import { formatPrice } from '../utils/priceUtils';
import './Home.scss';

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products?featured=true&limit=6`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Erreur récupération produits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <section className="hero">
        <h1>Bienvenue sur notre plateforme artisanale</h1>
        <p>Découvrez des produits uniques fabriqués par des artisans locaux</p>
        <Link to="/products" className="btn-primary">Voir les produits</Link>
      </section>

      <section className="featured-products">
        <h2>Produits en vedette</h2>
        {loading ? (
          <div className="loading">Chargement...</div>
        ) : (
          <div className="products-grid">
            {products.map(product => (
              <div key={product.id} className="product-card">
                <Link to={`/products/${product.id}`}>
                  <div className="product-image">
                    {(() => {
                      const firstImage = product.media && product.media.length > 0 
                        ? product.media.find(m => m.media_type === 'image')
                        : null;
                      const imageUrl = firstImage ? firstImage.media_url : product.image_url;
                      
                      return imageUrl ? (
                        <img src={getImageUrl(imageUrl)} alt={product.name} loading="lazy" />
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
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;

