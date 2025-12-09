import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { getImageUrl } from '../config';
import { getApiUrl } from '../utils/apiUtils';
import { formatPrice } from '../utils/priceUtils';
import './Products.scss';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    minPrice: '',
    maxPrice: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(getApiUrl('/categories'));
      setCategories(response.data.flat || []);
    } catch (error) {
      console.error('Erreur récupération catégories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);

      const url = getApiUrl(`/products${params.toString() ? '?' + params.toString() : ''}`);
      const response = await axios.get(url);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Erreur récupération produits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="products-page">
      <h1>Nos Produits</h1>

      <div className="filters">
        <input
          type="text"
          name="search"
          placeholder="Rechercher..."
          value={filters.search}
          onChange={handleFilterChange}
          className="search-input"
        />

        <select
          name="category"
          value={filters.category}
          onChange={handleFilterChange}
        >
          <option value="">Toutes les catégories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <input
          type="number"
          name="minPrice"
          placeholder="Prix min"
          value={filters.minPrice}
          onChange={handleFilterChange}
        />

        <input
          type="number"
          name="maxPrice"
          placeholder="Prix max"
          value={filters.maxPrice}
          onChange={handleFilterChange}
        />
      </div>

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
                  {(() => {
                    const rating = parseFloat(product.average_rating) || 0;
                    return rating > 0 && (
                      <p className="product-rating">⭐ {rating.toFixed(1)}</p>
                    );
                  })()}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="no-products">Aucun produit trouvé</div>
      )}
    </div>
  );
};

export default Products;

