import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import axios from 'axios';
import { API_URL } from '../config';
import { validatePhone, cleanPhoneNumber } from '../utils/phoneValidation';
import './Profile.scss';

const Profile = () => {
  const { user, fetchUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || ''
      });
      setLoading(false);
    }
  }, [user]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Filtrer les caractères non autorisés (seulement chiffres, -, espaces, parenthèses, points)
    const filteredValue = value.replace(/[^0-9\-()\s.]/g, '');
    setFormData({ ...formData, phone: filteredValue });
    
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
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, email: value });
    
    // Validation en temps réel
    if (value && !validateEmail(value)) {
      setEmailError('Format d\'email invalide.');
    } else {
      setEmailError('');
    }
  };

  const handleChange = (e) => {
    if (e.target.name === 'phone') {
      handlePhoneChange(e);
    } else if (e.target.name === 'email') {
      handleEmailChange(e);
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation email
    if (!validateEmail(formData.email)) {
      showError('Format d\'email invalide. Veuillez entrer une adresse email valide.');
      return;
    }

    // Validation téléphone
    if (formData.phone) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.isValid) {
        showError(phoneValidation.error);
        return;
      }
    }

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      
      // Nettoyer le numéro de téléphone avant l'envoi
      const cleanedPhone = formData.phone ? cleanPhoneNumber(formData.phone) : '';
      const dataToSend = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: cleanedPhone,
        email: formData.email.trim(),
        address: formData.address ? formData.address.trim() : ''
      };
      
      const response = await axios.put(`${API_URL}/auth/me`, dataToSend, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Mettre à jour le contexte utilisateur
      if (fetchUser) {
        await fetchUser(true);
      }
      
      // Mettre à jour le formulaire avec les données retournées par le serveur
      if (response.data && response.data.user) {
        const updatedUser = response.data.user;
        setFormData({
          first_name: updatedUser.first_name || '',
          last_name: updatedUser.last_name || '',
          phone: updatedUser.phone || '',
          email: updatedUser.email || '',
          address: updatedUser.address || ''
        });
      }
      
      showSuccess('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      console.error('Détails de l\'erreur:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || 'Erreur lors de la mise à jour';
      showError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="profile-page">
      <h1>Mon Profil</h1>

      <div className="profile-container">
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label>Prénom</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Nom</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
              title="Veuillez entrer une adresse email valide (ex: exemple@domaine.com)"
              className={emailError ? 'error' : ''}
            />
            {emailError && (
              <small style={{ color: '#ef4444', fontSize: '0.9em', display: 'block', marginTop: '4px' }}>
                {emailError}
              </small>
            )}
            {!emailError && (
              <small style={{ color: '#666', fontSize: '0.9em' }}>
                Format: exemple@domaine.com
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Téléphone <span style={{ color: 'red' }}>*</span></label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              pattern="^0[1-9][0-9]{8}$"
              placeholder="Ex: 0123456789"
              title="Format: 10 chiffres commençant par 0 (ex: 0123456789)"
              className={phoneError ? 'error' : ''}
            />
            {phoneError && (
              <small style={{ color: '#ef4444', fontSize: '0.9em', display: 'block', marginTop: '4px' }}>
                {phoneError}
              </small>
            )}
            {!phoneError && (
              <small style={{ color: '#666', fontSize: '0.9em' }}>
                Requis pour passer une commande.
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Adresse</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Rue, code postal, ville, pays"
              rows="3"
            />
            <small style={{ color: '#666', fontSize: '0.9em' }}>
              Adresse de livraison par défaut
            </small>
          </div>

          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;

