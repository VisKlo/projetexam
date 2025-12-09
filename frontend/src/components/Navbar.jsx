import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import './Navbar.scss';

const Navbar = () => {
  const { user, logout, isAdmin, isArtisan } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">✨</span>
          <span className="logo-text">Artisashop</span>
        </Link>

        <button 
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        <ul className={`navbar-menu ${menuOpen ? 'active' : ''}`}>
          <li><Link to="/products">Produits</Link></li>
          
          {user ? (
            <>
              <li><Link to="/cart">Panier</Link></li>
              <li><Link to="/orders">Commandes</Link></li>
              <li><Link to="/favorites">Favoris</Link></li>
              <li><Link to="/messages">Messages</Link></li>
              {isArtisan && (
                <li><Link to="/artisan">Dashboard</Link></li>
              )}
              {isAdmin && (
                <li><Link to="/admin">Admin</Link></li>
              )}
              <li><Link to="/profile">Profil</Link></li>
              <li className="notification-item-nav">
                <NotificationBell />
              </li>
              <li><button onClick={handleLogout}>Déconnexion</button></li>
            </>
          ) : (
            <>
              <li><Link to="/login">Connexion</Link></li>
              <li><Link to="/register">Inscription</Link></li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

