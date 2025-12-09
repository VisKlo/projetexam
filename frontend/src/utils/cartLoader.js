// Utilitaire pour charger le panier et les produits associés
import axios from 'axios';
import { getCart, saveCart } from './cartUtils';
import { API_URL } from '../config';

/**
 * Charge le panier d'un utilisateur et migre l'ancien panier si nécessaire
 */
export const loadUserCart = async (userId) => {
  if (!userId) return { cart: [], products: [] };

  // Migrer l'ancien panier global vers le panier de l'utilisateur si nécessaire
  const oldCart = JSON.parse(localStorage.getItem('cart') || '[]');
  if (oldCart.length > 0) {
    const userCart = getCart(userId);
    if (userCart.length === 0) {
      saveCart(userId, oldCart);
      localStorage.removeItem('cart');
    }
  }

  const cartData = getCart(userId);

  // Charger les produits associés
  let products = [];
  if (cartData.length > 0) {
    try {
      const productIds = cartData.map(item => item.product_id);
      const productPromises = productIds.map(id =>
        axios.get(`${API_URL}/products/${id}`)
      );
      const responses = await Promise.all(productPromises);
      products = responses.map(r => r.data.product);
    } catch (error) {
      console.error('Erreur récupération produits:', error);
    }
  }

  return { cart: cartData, products };
};

