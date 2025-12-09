// Utilitaires pour gérer le panier par utilisateur
// Le panier est stocké dans localStorage avec une clé unique par utilisateur

const getCartKey = (userId) => `cart_${userId}`;

export const getCart = (userId) => {
  if (!userId) return [];
  const cartData = localStorage.getItem(getCartKey(userId));
  return cartData ? JSON.parse(cartData) : [];
};

export const saveCart = (userId, cart) => {
  if (!userId) return;
  localStorage.setItem(getCartKey(userId), JSON.stringify(cart));
};

export const clearCart = (userId) => {
  if (!userId) return;
  localStorage.removeItem(getCartKey(userId));
};

export const clearAllCarts = () => {
  // Nettoyer tous les paniers (utile lors de la déconnexion)
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('cart_')) {
      localStorage.removeItem(key);
    }
  });
  // Nettoyer aussi l'ancien panier global si il existe
  localStorage.removeItem('cart');
};

export const addToCart = (userId, productId, quantity = 1) => {
  if (!userId) return false;
  const cart = getCart(userId);
  const existingItem = cart.find(item => item.product_id === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ product_id: productId, quantity });
  }
  
  saveCart(userId, cart);
  return true;
};

export const removeFromCart = (userId, productId) => {
  if (!userId) return false;
  const cart = getCart(userId);
  const updatedCart = cart.filter(item => item.product_id !== productId);
  saveCart(userId, updatedCart);
  return true;
};

export const updateCartItemQuantity = (userId, productId, quantity) => {
  if (!userId) return false;
  const cart = getCart(userId);
  const updatedCart = cart.map(item =>
    item.product_id === productId
      ? { ...item, quantity: Math.max(0, quantity) }
      : item
  ).filter(item => item.quantity > 0);
  saveCart(userId, updatedCart);
  return true;
};

