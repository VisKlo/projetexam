import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateCartItemQuantity, removeFromCart as removeFromCartUtil } from '../utils/cartUtils';
import { loadUserCart } from '../utils/cartLoader';
import { refreshCart } from '../utils/cartHelpers';
import { calculateSubtotal, calculateTotal, getShippingCost, formatPrice } from '../utils/priceUtils';
import { getImageUrl } from '../config';
import './Cart.scss';

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadCart();
  }, [user]);

  const loadCart = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    await refreshCart(user.id, setCart, setProducts);
    setLoading(false);
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (!user) return;
    if (newQuantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    updateCartItemQuantity(user.id, productId, newQuantity);
    await refreshCart(user.id, setCart, setProducts);
  };

  const removeFromCart = async (productId) => {
    if (!user) return;
    removeFromCartUtil(user.id, productId);
    await refreshCart(user.id, setCart, setProducts);
  };

  const subtotal = calculateSubtotal(cart, products);
  const shipping = getShippingCost();
  const total = calculateTotal(cart, products);

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="cart-page">
      <h1>Panier</h1>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <p>Votre panier est vide</p>
          <Link to="/products" className="btn-primary">Voir les produits</Link>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart.map(item => {
              const product = products.find(p => p.id === item.product_id);
              if (!product) return null;

              return (
                <div key={item.product_id} className="cart-item">
                  <Link to={`/products/${product.id}`} className="cart-item-image">
                    {product.image_url ? (
                      <img src={getImageUrl(product.image_url)} alt={product.name} loading="lazy" />
                    ) : (
                      <div className="placeholder-image">📦</div>
                    )}
                  </Link>
                  <div className="cart-item-info">
                    <h3>{product.name}</h3>
                    <p>{product.artisan_name}</p>
                    <p className="cart-item-price">{formatPrice(product.price)}</p>
                  </div>
                  <div className="cart-item-quantity">
                    <button onClick={() => updateQuantity(item.product_id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product_id, item.quantity + 1)}>+</button>
                  </div>
                  <div className="cart-item-total">
                    {formatPrice(parseFloat(product.price || 0) * parseInt(item.quantity || 0))}
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product_id)}
                    className="remove-btn"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <div className="summary-row">
              <span>Sous-total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>Livraison</span>
              <span>{formatPrice(shipping)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            <Link to="/checkout" className="btn-primary checkout-btn">
              Passer la commande
            </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;

