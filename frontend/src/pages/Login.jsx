import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import './Login.scss';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation email
    if (!validateEmail(formData.email)) {
      setError('Format d\'email invalide. Veuillez entrer une adresse email valide.');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, formData);
      login(response.data.user, response.data.token);
      navigate('/');
    } catch (error) {
      setError(error.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2>Connexion</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
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
            />
            <small style={{ color: '#666', fontSize: '0.9em' }}>
              Format: exemple@domaine.com
            </small>
          </div>
          <div className="form-group">
            <label>Mot de passe</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <p className="register-link">
          Pas encore de compte ? <Link to="/register">Inscrivez-vous</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

