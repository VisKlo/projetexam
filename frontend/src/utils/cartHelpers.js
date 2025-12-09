// Helpers pour mettre à jour le panier et recharger les produits
import { getCart } from './cartUtils';
import { loadUserCart } from './cartLoader';

/**
 * Met à jour le panier et recharge les produits associés
 */
export const refreshCart = async (userId, setCart, setProducts) => {
  if (!userId) return;
  const { cart: cartData, products: productsData } = await loadUserCart(userId);
  setCart(cartData);
  setProducts(productsData);
};

