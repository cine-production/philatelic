import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Utilise la variable d'environnement OU localhost par défaut
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const CartContext = createContext(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    let id = localStorage.getItem('cart_session_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('cart_session_id', id);
    }
    return id;
  });

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/cart`, {
        headers: { 'X-Session-ID': sessionId }
      });
      setCart(response.data);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${API_URL}/api/cart/add`,
        { product_id: productId },
        { headers: { 'X-Session-ID': sessionId } }
      );
      
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
        localStorage.setItem('cart_session_id', response.data.session_id);
      }
      
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Failed to add to cart:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erreur lors de l\'ajout au panier' 
      };
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (productId) => {
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/api/cart/${productId}`, {
        headers: { 'X-Session-ID': sessionId }
      });
      await fetchCart();
      return { success: true };
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Erreur lors de la suppression' 
      };
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);
      await axios.delete(`${API_URL}/api/cart`, {
        headers: { 'X-Session-ID': sessionId }
      });
      setCart({ items: [], total: 0 });
      return { success: true };
    } catch (error) {
      console.error('Failed to clear cart:', error);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    cart,
    loading,
    sessionId,
    itemCount: cart.items.length,
    addToCart,
    removeFromCart,
    clearCart,
    refreshCart: fetchCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
