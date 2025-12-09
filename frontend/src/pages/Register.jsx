import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import { validatePhone } from '../utils/phoneValidation';
import './Login.scss';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'client'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Filtrer les caractères non autorisés (seulement chiffres, -, espaces, parenthèses, points - pas de +)
    const filteredValue = value.replace(/[^0-9\-()\s.]/g, '');
    setFormData({ ...formData, phone: filteredValue });
    
    // Validation en temps réel (téléphone optionnel dans Register)
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
    setError('');

    // Validation email
    if (!validateEmail(formData.email)) {
      setError('Format d\'email invalide. Veuillez entrer une adresse email valide.');
      return;
    }

    // Validation téléphone (optionnel mais validé si renseigné)
    if (formData.phone) {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.isValid) {
        setError(phoneValidation.error);
        return;
      }
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/register`, formData);
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email,
        password: formData.password
      });
      login(loginResponse.data.user, loginResponse.data.token);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Inscription</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
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
            <label>Téléphone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
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
            <label>Mot de passe (min. 6 caractères)</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Type de compte</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="client">Client</option>
              <option value="artisan">Artisan</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Inscription...' : 'S\'inscrire'}
          </button>
        </form>
        <p className="register-link">
          Déjà un compte ? <Link to="/login">Connectez-vous</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

