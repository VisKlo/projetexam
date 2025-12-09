// Utilitaires pour les calculs de prix

const SHIPPING_COST = 5.00;

/**
 * Calcule le sous-total du panier
 */
export const calculateSubtotal = (cart, products) => {
  return cart.reduce((total, item) => {
    const product = products.find(p => p.id === item.product_id);
    if (!product) return total;
    return total + (parseFloat(product.price || 0) * parseInt(item.quantity || 0));
  }, 0);
};

/**
 * Retourne le coût de livraison
 */
export const getShippingCost = () => SHIPPING_COST;

/**
 * Calcule le total (sous-total + livraison)
 */
export const calculateTotal = (cart, products) => {
  return calculateSubtotal(cart, products) + getShippingCost();
};

/**
 * Formate un prix en euros
 */
export const formatPrice = (price) => {
  return `${parseFloat(price || 0).toFixed(2)}€`;
};

