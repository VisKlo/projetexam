import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { addToCart as addToCartUtil } from '../utils/cartUtils';
import { formatDateShort } from '../utils/dateUtils';
import { formatPrice } from '../utils/priceUtils';
import { API_URL, getImageUrl } from '../config';
import './ProductDetail.scss';

const ProductDetail = () => {
  const { id } = useParams();
  const { user, isClient, isArtisan } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [addingReview, setAddingReview] = useState(false);
  const [replyingToReview, setReplyingToReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product && isClient && user) {
      checkPurchase();
    } else {
      setHasPurchased(false);
    }
  }, [product, isClient, user, id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/${id}`);
      setProduct(response.data.product);
    } catch (error) {
      console.error('Erreur récupération produit:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPurchase = async () => {
    if (!isClient || !user) {
      setHasPurchased(false);
      return;
    }
    
    setCheckingPurchase(true);
    try {
      const response = await axios.get(`${API_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const orders = response.data.orders || [];
      const hasBought = orders.some(order => 
        order.payment_status === 'paid' && 
        order.items && 
        order.items.some(item => item.product_id === parseInt(id))
      );
      
      setHasPurchased(hasBought);
    } catch (error) {
      console.error('Erreur vérification achat:', error);
      setHasPurchased(false);
    } finally {
      setCheckingPurchase(false);
    }
  };

  const addToCart = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    addToCartUtil(user.id, parseInt(id), quantity);
    showSuccess('Produit ajouté au panier !');
  };

  const addToFavorites = async () => {
    if (!isClient) {
      navigate('/login');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/favorites/${id}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      showSuccess('Produit ajouté aux favoris !');
      fetchProduct();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de l\'ajout aux favoris';
      showError(errorMsg);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!isClient) {
      navigate('/login');
      return;
    }
    setAddingReview(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/reviews`, {
        product_id: parseInt(id),
        rating: review.rating,
        comment: review.comment
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      showSuccess('Avis ajouté avec succès !');
      setReview({ rating: 5, comment: '' });
      await fetchProduct();
      if (isClient && user) {
        await checkPurchase();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de l\'ajout de l\'avis';
      showError(errorMsg);
    } finally {
      setAddingReview(false);
    }
  };

  const submitReply = async (reviewId) => {
    if (!replyText.trim()) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/reviews/${reviewId}/reply`, {
        reply: replyText
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      showSuccess('Réponse ajoutée avec succès !');
      setReplyingToReview(null);
      setReplyText('');
      fetchProduct();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de l\'ajout de la réponse';
      showError(errorMsg);
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;
  if (!product) return <div className="error">Produit non trouvé</div>;

  return (
    <div className="product-detail">
      <div className="product-detail-container">
        <div className="product-media-section">
          {product.media && product.media.length > 0 ? (
            <div className="product-media-gallery">
              {product.media.map((media, index) => (
                <div key={media.id || index} className="media-item">
                  {media.media_type === 'image' ? (
                    <img 
                      src={getImageUrl(media.media_url)} 
                      alt={`${product.name} - Image ${index + 1}`}
                      loading={index === 0 ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <video 
                      controls 
                      preload={index === 0 ? 'auto' : 'metadata'}
                      style={{ width: '100%', maxHeight: '500px' }}
                    >
                      <source src={getImageUrl(media.media_url)} type={media.media_url.includes('.mp4') ? 'video/mp4' : 'video/webm'} />
                      Votre navigateur ne supporte pas la lecture de vidéos.
                    </video>
                  )}
                </div>
              ))}
            </div>
          ) : product.image_url ? (
            <div className="product-image-section">
              <img src={getImageUrl(product.image_url)} alt={product.name} />
            </div>
          ) : (
            <div className="placeholder-image">📦</div>
          )}
        </div>

        <div className="product-info-section">
          <h1>{product.name}</h1>
          <p className="product-price">{formatPrice(product.price)}</p>
          <p className="product-artisan">Par {product.artisan_name}</p>
          
          {(() => {
            const rating = parseFloat(product.average_rating) || 0;
            const reviewCount = parseInt(product.review_count) || 0;
            return rating > 0 && (
              <p className="product-rating">⭐ {rating.toFixed(1)} ({reviewCount} avis)</p>
            );
          })()}

          <p className="product-description">{product.description}</p>

          <div className="product-stock">
            Stock disponible : {product.stock}
          </div>

          <div className="product-actions">
            <div className="quantity-selector">
              <label>Quantité :</label>
              <input
                type="number"
                min="1"
                max={product.stock}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
              />
            </div>

            <button onClick={addToCart} className="btn-primary" disabled={product.stock === 0}>
              {product.stock === 0 ? 'Rupture de stock' : 'Ajouter au panier'}
            </button>

            {isClient && (
              <button onClick={addToFavorites} className="btn-secondary">
                ❤️ Ajouter aux favoris
              </button>
            )}
            {isClient && product.artisan_user_id && (
              <button 
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const response = await axios.post(`${API_URL}/messages/conversations`, {
                      artisan_id: product.artisan_user_id,
                      product_id: parseInt(id)
                    }, {
                      headers: {
                        Authorization: `Bearer ${token}`
                      }
                    });
                    navigate('/messages');
                  } catch (error) {
                    if (error.response?.status === 403) {
                      navigate('/messages');
                    } else {
                      showError(error.response?.data?.error || 'Erreur lors de la création de la conversation');
                    }
                  }
                }}
                className="btn-secondary"
              >
                💬 Contacter l'artisan
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="reviews-section">
        <h2>Avis clients</h2>
        
        {isClient && (
          <>
            {checkingPurchase ? (
              <p style={{ padding: '1rem', color: '#666' }}>Vérification de vos achats...</p>
            ) : hasPurchased ? (
              <form onSubmit={submitReview} className="review-form">
                <div className="form-group">
                  <label>Note</label>
                  <select
                    value={review.rating}
                    onChange={(e) => setReview({ ...review, rating: parseInt(e.target.value) })}
                  >
                    <option value={5}>5 ⭐</option>
                    <option value={4}>4 ⭐</option>
                    <option value={3}>3 ⭐</option>
                    <option value={2}>2 ⭐</option>
                    <option value={1}>1 ⭐</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Commentaire</label>
                  <textarea
                    value={review.comment}
                    onChange={(e) => setReview({ ...review, comment: e.target.value })}
                    rows="4"
                  />
                </div>
                <button type="submit" disabled={addingReview} className="btn-primary">
                  {addingReview ? 'Envoi...' : 'Publier l\'avis'}
                </button>
              </form>
            ) : (
              <p style={{ padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px', color: '#856404' }}>
                Vous devez avoir acheté ce produit pour pouvoir laisser un avis.
              </p>
            )}
          </>
        )}

        <div className="reviews-list">
          {product.reviews && product.reviews.length > 0 ? (
            product.reviews.map(review => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <strong>{review.first_name} {review.last_name}</strong>
                  <span className="review-rating">{'⭐'.repeat(review.rating)}</span>
                </div>
                <p className="review-comment">{review.comment}</p>
                <p className="review-date">{formatDateShort(review.created_at)}</p>
                
                {review.artisan_reply && (
                  <div className="artisan-reply">
                    <strong style={{ color: '#667eea' }}>
                      {review.artisan_name || product.artisan_name} :
                    </strong>
                    <p>{review.artisan_reply}</p>
                    <p className="reply-date">
                      {formatDateShort(review.artisan_reply_at)}
                    </p>
                  </div>
                )}

                {isArtisan && product.artisan_user_id === user?.id && !review.artisan_reply && (
                  <div className="reply-section">
                    {replyingToReview === review.id ? (
                      <div className="reply-form">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Tapez votre réponse..."
                          rows="3"
                          style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => submitReply(review.id)}
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '14px' }}
                          >
                            Envoyer
                          </button>
                          <button 
                            onClick={() => {
                              setReplyingToReview(null);
                              setReplyText('');
                            }}
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '14px' }}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setReplyingToReview(review.id)}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '14px', marginTop: '8px' }}
                      >
                        Répondre
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>Aucun avis pour ce produit</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;

