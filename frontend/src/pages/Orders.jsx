import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
// Les notifications de commandes ont été remplacées par des messages automatiques
import { useNavigate } from 'react-router-dom';
import apiClient, { getErrorMessage } from '../utils/apiClient';
import { formatDateShort } from '../utils/dateUtils';
import { formatPrice } from '../utils/priceUtils';
import './Orders.scss';

const Orders = () => {
  const { user, isClient, isAdmin } = useAuth();
  const { showError } = useNotification();
  // Les notifications de commandes ont été remplacées par des messages automatiques
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOrders();
      // Les notifications de commandes ont été remplacées par des messages automatiques
      // Plus besoin de marquer des notifications comme lues ici
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const response = await apiClient.get('/orders');
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error('Erreur récupération commandes:', error);
      showError(getErrorMessage(error, 'Erreur lors de la récupération des commandes'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="orders-page">
      <h1>Mes Commandes</h1>

      {orders.length === 0 ? (
        <div className="no-orders">
          <p>Aucune commande pour le moment</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <h3>Commande #{order.order_number}</h3>
                  <p className="order-date">
                    {formatDateShort(order.created_at)}
                  </p>
                </div>
                <div className="order-status">
                  <span className={`status-badge status-${order.status}`}>
                    {order.status}
                  </span>
                  <span className={`payment-badge payment-${order.payment_status}`}>
                    {order.payment_status}
                  </span>
                </div>
              </div>

              <div className="order-items">
                {order.items && order.items.map((item, index) => (
                  <div key={index} className="order-item">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <span>{item.product_name} x{item.quantity}</span>
                      {isClient && item.artisan_name && item.artisan_id && (
                        <span 
                          onClick={async () => {
                            try {
                              await apiClient.post('/messages/conversations', {
                                artisan_id: item.artisan_id,
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
                            fontSize: '0.9em',
                            fontWeight: '500'
                          }}
                        >
                          Artisan: {item.artisan_name} 💬
                        </span>
                      )}
                    </div>
                    <span>{formatPrice(parseFloat(item.price || 0) * parseInt(item.quantity || 0))}</span>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div className="order-total">
                  <strong>Total: {formatPrice(order.total)}</strong>
                </div>
                {order.shipping_address && (
                  <p className="shipping-info" style={{ marginTop: '10px', fontSize: '0.9em', color: '#666' }}>
                    <strong>Adresse:</strong> {order.shipping_address}
                  </p>
                )}
                {order.shipping_phone && (
                  <p className="shipping-info" style={{ marginTop: '5px', fontSize: '0.9em', color: '#666' }}>
                    <strong>Téléphone:</strong> {order.shipping_phone}
                  </p>
                )}
                {order.tracking_number && (
                  <p className="tracking" style={{ marginTop: '5px' }}>Suivi: {order.tracking_number}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;

