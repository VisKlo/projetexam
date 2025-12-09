import React from 'react';
import './Footer.scss';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <p className="footer-copyright">
            © {currentYear} Artisashop. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

