import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { formatRelativeTime } from '../utils/dateUtils';
import './NotificationBell.scss';

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = React.useCallback(async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      const [notificationsRes, countRes] = await Promise.all([
        axios.get(`${API_URL}/notifications?unread=true`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/notifications/count`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setNotifications(notificationsRes.data.notifications || []);
      setUnreadCount(countRes.data.count || 0);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Erreur récupération notifications:', error);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      
      window.refreshNotifications = fetchNotifications;
      
      const handleRefresh = () => fetchNotifications();
      window.addEventListener('notifications-refresh', handleRefresh);
      
      return () => {
        clearInterval(interval);
        delete window.refreshNotifications;
        window.removeEventListener('notifications-refresh', handleRefresh);
      };
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      try {
        const token = localStorage.getItem('token');
        await axios.put(`${API_URL}/notifications/${notification.id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}`         }
      });
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Erreur marquage notification:', error);
      }
    }

    setIsOpen(false);
    if (notification.redirect_to) {
      navigate(notification.redirect_to);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur marquage toutes notifications:', error);
    }
  };

  if (!user) return null;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lue${unreadCount > 1 ? 's' : ''})` : ''}`}
        aria-expanded={isOpen}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="mark-all-read"
                onClick={markAllAsRead}
                aria-label="Marquer toutes les notifications comme lues"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications" role="status">
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  role="menuitem"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {formatRelativeTime(notification.created_at)}
                    </div>
                  </div>
                  {!notification.is_read && (
                    <div className="unread-indicator" aria-label="Non lue"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
