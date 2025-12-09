import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getCart, clearCart } from '../utils/cartUtils';
import { loadUserCart } from '../utils/cartLoader';
import { calculateSubtotal, calculateTotal, getShippingCost, formatPrice } from '../utils/priceUtils';
import { formatDateShort } from '../utils/dateUtils';
import { validatePhone } from '../utils/phoneValidation';
import { API_URL, STRIPE_PUBLISHABLE_KEY, getImageUrl } from '../config';
import './Checkout.scss';

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

const CheckoutForm = ({ orderId, total, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { showSuccess, showError } = useNotification();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError(null);

    if (!stripe || !elements) return;

    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(`${API_URL}/payment/create-intent`, {
        order_id: orderId,
        amount: total
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const cardNumberElement = elements.getElement(CardNumberElement);
      
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            card: cardNumberElement,
          }
        }
      );

      if (confirmError) {
        setError(confirmError.message);
        showError(confirmError.message);
        setProcessing(false);
      } else {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/payment/confirm`, {
          payment_intent_id: data.payment_intent_id,
          order_id: orderId
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        showSuccess('Paiement confirmé avec succès !');
        onSuccess();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Erreur lors du paiement';
      setError(errorMsg);
      showError(errorMsg);
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#333',
        fontFamily: 'Roboto, system-ui, -apple-system, sans-serif',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#ef4444',
      },
    },
  };

  return (
    <div className="checkout-payment-section">
      <div className="payment-header">
        <h2>💳 Paiement sécurisé</h2>
        <p className="payment-subtitle">Vos informations sont protégées et sécurisées</p>
      </div>

      <form onSubmit={handleSubmit} className="payment-form">
        <div className="form-group">
          <label htmlFor="card-number">
            Numéro de carte <span className="required">*</span>
          </label>
          <div className="card-input-container">
            <CardNumberElement
              id="card-number"
              options={cardElementOptions}
              className="stripe-card-input"
            />
            <div className="card-brands">
              <span className="card-brand" aria-label="Visa">Visa</span>
              <span className="card-brand" aria-label="Mastercard">MC</span>
              <span className="card-brand" aria-label="American Express">AMEX</span>
            </div>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="card-expiry">
              Date d'expiration <span className="required">*</span>
            </label>
            <CardExpiryElement
              id="card-expiry"
              options={cardElementOptions}
              className="stripe-card-input"
            />
          </div>
          <div className="form-group">
            <label htmlFor="card-cvc">
              CVC <span className="required">*</span>
              <span className="cvc-tooltip" title="Les 3 chiffres au dos de votre carte">ℹ️</span>
            </label>
            <CardCvcElement
              id="card-cvc"
              options={cardElementOptions}
              className="stripe-card-input"
            />
          </div>
        </div>

        {error && (
          <div className="error-message" role="alert" aria-live="polite">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={processing || !stripe} 
          className="btn-pay"
          aria-label={`Payer ${total.toFixed(2)}€`}
        >
          {processing ? (
            <>
              <span className="spinner" aria-hidden="true"></span>
              Traitement en cours...
            </>
          ) : (
            <>
              <span>Payer</span>
              <span className="amount">{total.toFixed(2)}€</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

const Checkout = () => {
  const { user } = useAuth();
  const { showSuccess, showError, showWarning } = useNotification();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [order, setOrder] = useState(null);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadUserProfile();
    loadCart();
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const profile = response.data.user;
      setUserProfile(profile);
      
      // Pré-remplir le téléphone depuis le profil
      if (profile.phone) {
        setShippingPhone(profile.phone);
      }
      
      // Pré-remplir l'adresse depuis le profil
      if (profile.address) {
        setShippingAddress(profile.address);
      }
      
      if (!profile.phone || profile.phone.trim() === '') {
        showWarning('Veuillez compléter votre numéro de téléphone dans votre profil avant de passer commande');
      }
    } catch (error) {
      console.error('Erreur récupération profil:', error);
      showError('Erreur lors de la récupération de votre profil');
    } finally {
      setCheckingProfile(false);
    }
  };

  const loadCart = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { cart: cartData, products: productsData } = await loadUserCart(user.id);
    setCart(cartData);
    setProducts(productsData);
    setLoading(false);
  };

  const subtotal = calculateSubtotal(cart, products);
  const shipping = getShippingCost();
  const total = calculateTotal(cart, products);

  const createOrder = async () => {
    if (!shippingAddress.trim()) {
      showWarning('Veuillez entrer une adresse de livraison');
      return;
    }

    if (!shippingPhone.trim()) {
      showWarning('Veuillez entrer un numéro de téléphone');
      return;
    }

    const phoneValidation = validatePhone(shippingPhone);
    if (!phoneValidation.isValid) {
      showError(phoneValidation.error);
      return;
    }

    setCreatingOrder(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity
      }));

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/orders`, {
        items,
        shipping_address: shippingAddress.trim(),
        shipping_phone: shippingPhone.trim()
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setOrder(response.data.order);
      clearCart(user.id);
      showSuccess('Commande créée avec succès !');
    } catch (error) {
      console.error('Erreur création commande:', error);
      const errorData = error.response?.data;
      if (errorData?.details && Array.isArray(errorData.details)) {
        const errorMessages = errorData.details.map(err =>
          `${err.field || 'Champ'}: ${err.message}`
        ).join('\n');
        showError(errorMessages);
      } else {
        const errorMsg = errorData?.error || 'Erreur lors de la création de la commande';
        showError(errorMsg);
      }
    } finally {
      setCreatingOrder(false);
    }
  };

  const handlePaymentSuccess = () => {
    showSuccess('Paiement réussi ! Votre commande est en cours de traitement.');
    navigate('/orders');
  };

  if (loading || checkingProfile) {
    return (
      <div className="checkout-page">
        <div className="loading-container">
          <div className="loading-spinner" aria-label="Chargement"></div>
          <p>Chargement de votre commande...</p>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="checkout-page">
        <div className="empty-cart">
          <div className="empty-icon">🛒</div>
          <h2>Votre panier est vide</h2>
          <p>Ajoutez des produits à votre panier avant de passer commande.</p>
          <button onClick={() => navigate('/products')} className="btn-primary">
            Voir les produits
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="checkout-page">
        <div className="checkout-header">
          <h1>Finaliser votre commande</h1>
          <div className="checkout-steps">
            <div className="step active">
              <span className="step-number">1</span>
              <span className="step-label">Livraison</span>
            </div>
            <div className="step-divider"></div>
            <div className="step">
              <span className="step-number">2</span>
              <span className="step-label">Paiement</span>
            </div>
          </div>
        </div>

        {(!userProfile?.phone || userProfile.phone.trim() === '') && (
          <div className="warning-banner" role="alert">
            <span className="warning-icon">⚠️</span>
            <div className="warning-content">
              <strong>Attention :</strong> Votre numéro de téléphone n'est pas renseigné dans votre profil.
              <a href="/profile" className="warning-link">Complétez votre profil</a> ou renseignez-le ci-dessous.
            </div>
          </div>
        )}

        <div className="checkout-container">
          <div className="checkout-main">
            <div className="checkout-section">
              <div className="section-header">
                <span className="section-icon">📍</span>
                <h2>Informations de livraison</h2>
              </div>
              
              <div className="form-group">
                <label htmlFor="shipping-address">
                  Adresse de livraison <span className="required">*</span>
                </label>
                <textarea
                  id="shipping-address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Entrez votre adresse complète de livraison (rue, code postal, ville, pays)"
                  rows="4"
                  required
                  aria-describedby="address-help"
                />
                <small id="address-help" className="field-help">
                  L'adresse complète est nécessaire pour la livraison
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="shipping-phone">
                  Numéro de téléphone <span className="required">*</span>
                </label>
                <input
                  id="shipping-phone"
                  type="tel"
                  value={shippingPhone}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Filtrer les caractères non autorisés (seulement chiffres, -, espaces, parenthèses, points - pas de +)
                    const filteredValue = value.replace(/[^0-9\-()\s.]/g, '');
                    setShippingPhone(filteredValue);
                    
                    // Validation en temps réel
                    if (filteredValue) {
                      const validation = validatePhone(filteredValue);
                      if (!validation.isValid) {
                        setPhoneError(validation.error);
                      } else {
                        setPhoneError('');
                      }
                    } else {
                      setPhoneError('');
                    }
                  }}
                  placeholder="Ex: 0123456789"
                  required
                  pattern="^0[1-9][0-9]{8}$"
                  title="Format: 10 chiffres commençant par 0 (ex: 0123456789)"
                  aria-describedby="phone-help"
                  className={phoneError ? 'error' : ''}
                />
                {phoneError && (
                  <small id="phone-help" style={{ color: '#ef4444', fontSize: '0.9em', display: 'block', marginTop: '4px' }}>
                    {phoneError}
                  </small>
                )}
                {!phoneError && (
                  <small id="phone-help" className="field-help">
                    Requis pour que l'artisan puisse vous contacter et organiser la livraison
                  </small>
                )}
              </div>

              <button
                onClick={createOrder}
                disabled={creatingOrder || !shippingAddress.trim() || !shippingPhone.trim()}
                className="btn-continue"
                aria-label="Continuer vers le paiement"
              >
                {creatingOrder ? (
                  <>
                    <span className="spinner" aria-hidden="true"></span>
                    Création en cours...
                  </>
                ) : (
                  <>
                    Continuer vers le paiement
                    <span className="btn-arrow">→</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="checkout-sidebar">
            <div className="order-summary">
              <h3>Résumé de la commande</h3>
              
              <div className="summary-items">
                {cart.map(item => {
                  const product = products.find(p => p.id === item.product_id);
                  if (!product) return null;
                  const itemTotal = parseFloat(product.price || 0) * parseInt(item.quantity || 0);
                  return (
                    <div key={item.product_id} className="summary-item">
                      <div className="item-image">
                        {product.image_url ? (
                          <img src={getImageUrl(product.image_url)} alt={product.name} loading="lazy" />
                        ) : (
                          <div className="item-placeholder">📦</div>
                        )}
                      </div>
                      <div className="item-details">
                        <div className="item-name">{product.name}</div>
                        <div className="item-meta">
                          Quantité: {item.quantity} × {formatPrice(product.price)}
                        </div>
                      </div>
                      <div className="item-price">{formatPrice(itemTotal)}</div>
                    </div>
                  );
                })}
              </div>

              <div className="summary-divider"></div>

              <div className="summary-row">
                <span>Sous-total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Livraison</span>
                <span>{formatPrice(shipping)}</span>
              </div>
              <div className="summary-total">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-header">
        <h1>Paiement sécurisé</h1>
        <div className="checkout-steps">
          <div className="step completed">
            <span className="step-number">✓</span>
            <span className="step-label">Livraison</span>
          </div>
          <div className="step-divider"></div>
          <div className="step active">
            <span className="step-number">2</span>
            <span className="step-label">Paiement</span>
          </div>
        </div>
      </div>

      {stripePromise ? (
        <div className="checkout-container">
          <div className="checkout-main">
            <Elements stripe={stripePromise}>
              <CheckoutForm
                orderId={order.id}
                total={order.total}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          </div>
          <div className="checkout-sidebar">
            <div className="order-summary">
              <h3>Résumé de la commande</h3>
              <div className="summary-row">
                <span>Total</span>
                <span className="summary-total-amount">{order.total.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <div className="error-content">
            <h3>Stripe n'est pas configuré</h3>
            <p>Pour activer les paiements, vous devez configurer la clé publique Stripe dans votre fichier <code>.env</code></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
