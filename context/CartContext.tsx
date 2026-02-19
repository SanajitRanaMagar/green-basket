import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getCart, addToCart as apiAddToCart, updateCartQuantity, deleteCartItem, clearCart as apiClearCart } from '../services/api';
import { useToast } from './ToastContext';
import { CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addItem: (productId: string, quantity: number) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  total: number;
  count: number;
  addingIds: string[];
  loading: boolean;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingIds, setAddingIds] = useState<string[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (session?.user.id) {
      loadCart(session.user.id);
    } else {
      setItems([]);
    }
  }, [session]);

  const loadCart = async (userId: string) => {
    setLoading(true);
    try {
      const data = await getCart(userId);
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async (productId: string, quantity: number) => {
    if (!session?.user.id) {
      toast.showToast('Sign in to add items to cart', 'info');
      return;
    }

    // prevent duplicate add requests for same product
    if (addingIds.includes(productId)) return;

    setAddingIds(prev => [...prev, productId]);
    try {
      await apiAddToCart(session.user.id, productId, quantity);
      await loadCart(session.user.id);
      toast.showToast('Product added to cart', 'success');
    } catch (err) {
      console.error(err);
      toast.showToast('Failed to add item', 'error');
    } finally {
      setAddingIds(prev => prev.filter(id => id !== productId));
    }
  };

  const updateItem = async (itemId: string, quantity: number) => {
    try {
      await updateCartQuantity(itemId, quantity);
      await loadCart(session!.user.id);
    } catch (err) {
      console.error(err);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await deleteCartItem(itemId);
      await loadCart(session!.user.id);
    } catch (err) {
      console.error(err);
    }
  };

  const clear = async () => {
    if (!session?.user.id) return;
    try {
      await apiClearCart(session.user.id);
      setItems([]);
    } catch (err) {
      console.error(err);
    }
  };

  const total = items.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateItem, removeItem, clear, total, count, addingIds, loading }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
