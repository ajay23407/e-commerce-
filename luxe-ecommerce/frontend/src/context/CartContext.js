import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [cart, setCart]         = useState({ items: [], total: 0 });
  const [loading, setLoading]   = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) { setCart({ items: [], total: 0 }); return; }
    try {
      setLoading(true);
      const res = await api.get('/cart');
      setCart(res.data.cart);
    } catch {} finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = async (product_id, qty = 1, variant = null) => {
    if (!user) { toast.error('Please log in to add items to cart.'); return false; }
    try {
      await api.post('/cart', { product_id, qty, variant });
      await fetchCart();
      toast.success('Added to cart!');
      setCartOpen(true);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart.');
      return false;
    }
  };

  const updateQty = async (product_id, qty, variant = null) => {
    try {
      await api.put('/cart', { product_id, qty, variant });
      await fetchCart();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update cart.');
    }
  };

  const removeFromCart = async (product_id) => {
    try {
      await api.delete(`/cart/${product_id}`);
      await fetchCart();
      toast.success('Removed from cart.');
    } catch {}
  };

  const clearCart = async () => {
    try {
      await api.delete('/cart');
      setCart({ items: [], total: 0 });
    } catch {}
  };

  const itemCount = cart.items?.length || 0;
  const totalItems = cart.items?.reduce((s, i) => s + i.qty, 0) || 0;

  return (
    <CartContext.Provider value={{
      cart, loading, cartOpen, setCartOpen,
      addToCart, updateQty, removeFromCart, clearCart,
      fetchCart, itemCount, totalItems
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
