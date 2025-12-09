import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { markPageNotificationsAsRead } from '../utils/notificationUtils';
import axios from 'axios';
import { API_URL } from '../config';
import { formatRelativeTime, formatMessageTime } from '../utils/dateUtils';
import { getInitials } from '../utils/stringUtils';
import './Messages.scss';

const Messages = () => {
  const { user } = useAuth();
  const { showError, showSuccess } = useNotification();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showConversations, setShowConversations] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchConversations();
      markPageNotificationsAsRead('messages');
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.id);
      }, 3000); // Rafraîchir toutes les 3 secondes
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/messages/conversations`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setConversations(response.data.conversations || []);
      if (response.data.conversations && response.data.conversations.length > 0 && !selectedConversation) {
        setSelectedConversation(response.data.conversations[0]);
      }
    } catch (error) {
      console.error('Erreur récupération conversations:', error);
      showError('Erreur lors du chargement des conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/messages/conversations/${conversationId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setMessages(response.data.messages || []);
      
      window.dispatchEvent(new Event('notifications-refresh'));
    } catch (error) {
      console.error('Erreur récupération messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/messages/conversations/${selectedConversation.id}/messages`,
        { message: newMessage.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setMessages([...messages, response.data.message]);
      setNewMessage('');
      fetchConversations(); // Rafraîchir pour mettre à jour le dernier message
    } catch (error) {
      console.error('Erreur envoi message:', error);
      showError(error.response?.data?.error || 'Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e?.stopPropagation();
    
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/messages/conversations/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      showSuccess('Conversation supprimée avec succès');
      
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
      
      fetchConversations();
    } catch (error) {
      console.error('Erreur suppression conversation:', error);
      showError(error.response?.data?.error || 'Erreur lors de la suppression de la conversation');
    }
  };

  if (loading) {
    return (
      <div className="messages-page">
        <div className="loading-container">
          <div className="loading-spinner" aria-label="Chargement des conversations"></div>
          <p>Chargement des conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      <h1>Messagerie</h1>
      
      <div className="messages-container">
        {/* Liste des conversations - Mobile avec toggle */}
        <div className={`conversations-sidebar ${showConversations ? 'open' : ''}`}>
          <div className="conversations-header">
            <h2>Conversations</h2>
            <button
              className="close-conversations"
              onClick={() => setShowConversations(false)}
              aria-label="Fermer la liste des conversations"
            >
              ✕
            </button>
          </div>
          
          {conversations.length === 0 ? (
            <div className="no-conversations" role="status" aria-live="polite">
              <div className="empty-icon">💬</div>
              <p>Aucune conversation pour le moment</p>
            </div>
          ) : (
            <div className="conversations-list" role="list">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  role="listitem"
                  className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedConversation(conv);
                    setShowConversations(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedConversation(conv);
                      setShowConversations(false);
                    }
                  }}
                  tabIndex={0}
                  aria-label={`Conversation avec ${conv.other_user_first_name} ${conv.other_user_last_name}`}
                >
                  <div className="conversation-avatar">
                    {getInitials(conv.other_user_first_name, conv.other_user_last_name)}
                  </div>
                  <div className="conversation-content">
                    <div className="conversation-header">
                      <strong className="conversation-name">
                        {conv.other_user_first_name} {conv.other_user_last_name}
                      </strong>
                      {conv.unread_count > 0 && (
                        <span className="unread-badge" aria-label={`${conv.unread_count} message${conv.unread_count > 1 ? 's' : ''} non lu${conv.unread_count > 1 ? 's' : ''}`}>
                          {conv.unread_count}
                        </span>
                      )}
                      <span className="conversation-time">
                        {formatRelativeTime(conv.last_message_at)}
                      </span>
                    </div>
                    {conv.last_message && (
                      <div className="conversation-preview">
                        {conv.last_message.length > 60 
                          ? conv.last_message.substring(0, 60) + '...'
                          : conv.last_message}
                      </div>
                    )}
                  </div>
                  <button
                    className="delete-conversation-item-btn"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    aria-label={`Supprimer la conversation avec ${conv.other_user_first_name} ${conv.other_user_last_name}`}
                    title="Supprimer la conversation"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panneau de messages */}
        <div className="messages-panel">
          {selectedConversation ? (
            <>
              {/* En-tête de conversation */}
              <div className="messages-header">
                <button
                  className="toggle-conversations"
                  onClick={() => setShowConversations(!showConversations)}
                  aria-label="Afficher la liste des conversations"
                >
                  ☰
                </button>
                <div className="conversation-info">
                  <div className="conversation-avatar-header">
                    {getInitials(selectedConversation.other_user_first_name, selectedConversation.other_user_last_name)}
                  </div>
                  <div>
                    <h3>
                      {selectedConversation.other_user_first_name} {selectedConversation.other_user_last_name}
                    </h3>
                  </div>
                </div>
                <button
                  className="delete-conversation-btn"
                  onClick={(e) => handleDeleteConversation(selectedConversation.id, e)}
                  aria-label="Supprimer la conversation"
                  title="Supprimer la conversation"
                >
                  🗑️
                </button>
              </div>

              {/* Liste des messages */}
              <div 
                className="messages-list" 
                ref={messagesContainerRef}
                role="log"
                aria-label="Messages de la conversation"
              >
                {messages.length === 0 ? (
                  <div className="no-messages" role="status">
                    <div className="empty-icon">💭</div>
                    <p>Aucun message pour le moment. Commencez la conversation !</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage = message.sender_id === user.id;
                    const prevMessage = index > 0 ? messages[index - 1] : null;
                    const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                    const isSameSender = prevMessage && prevMessage.sender_id === message.sender_id;
                    const timeDiff = prevMessage 
                      ? new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime()
                      : Infinity;
                    const showAvatar = !isSameSender || timeDiff > 300000; // 5 minutes
                    const showTime = !nextMessage || 
                      new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() > 300000;

                    return (
                      <div
                        key={message.id}
                        className={`message-item ${isOwnMessage ? 'sent' : 'received'} ${isSameSender ? 'same-sender' : ''}`}
                        role="listitem"
                      >
                        {isOwnMessage ? (
                          <>
                            <div className="message-spacer"></div>
                            <div className="message-wrapper">
                              <div className="message-bubble">
                                <div className="message-text">{message.message}</div>
                                {showTime && (
                                  <div className="message-time" aria-label={`Envoyé le ${formatMessageTime(message.created_at)}`}>
                                    {formatMessageTime(message.created_at)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="message-spacer"></div>
                          </>
                        ) : (
                          <>
                            <div 
                              className="message-avatar" 
                              aria-label={`Avatar de ${message.first_name} ${message.last_name}`}
                            >
                              {showAvatar ? getInitials(message.first_name, message.last_name) : ''}
                            </div>
                            <div className="message-wrapper">
                              {!isSameSender && (
                                <div className="message-sender-name">
                                  {message.first_name} {message.last_name}
                                </div>
                              )}
                              <div className="message-bubble">
                                <div className="message-text">{message.message}</div>
                                {showTime && (
                                  <div className="message-time" aria-label={`Envoyé le ${formatMessageTime(message.created_at)}`}>
                                    {formatMessageTime(message.created_at)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="message-spacer"></div>
                          </>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Formulaire d'envoi */}
              {selectedConversation.other_user_email === 'system@site.com' || 
               (selectedConversation.other_user_first_name === 'Système' && selectedConversation.other_user_last_name === 'Automatique') ? (
                <div className="message-form-disabled" role="status" aria-live="polite">
                  <div className="system-message-info">
                    <span className="info-icon">ℹ️</span>
                    <p>Cette conversation est réservée aux messages automatiques du système. Vous ne pouvez pas y répondre.</p>
                  </div>
                </div>
              ) : (
                <form 
                  onSubmit={handleSendMessage} 
                  className="message-form"
                  aria-label="Formulaire d'envoi de message"
                >
                  <div className="message-input-wrapper">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Tapez votre message..."
                      className="message-input"
                      aria-label="Zone de saisie du message"
                      disabled={sending}
                      maxLength={1000}
                    />
                    <button 
                      type="submit" 
                      className="send-button" 
                      disabled={!newMessage.trim() || sending}
                      aria-label="Envoyer le message"
                    >
                      {sending ? (
                        <div className="sending-spinner" aria-label="Envoi en cours"></div>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            <div className="no-conversation-selected" role="status">
              <div className="empty-icon">💬</div>
              <p>Sélectionnez une conversation pour commencer</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
