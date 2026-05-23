import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CartItem, Product, ProductSize } from '../types';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size: ProductSize, quantity?: number) => void;
  updateQuantity: (productId: string, sizeId: string, quantity: number) => void;
  removeItem: (productId: string, sizeId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'coco36-cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* quota or private mode */ }
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((product: Product, size: ProductSize, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id && i.sizeId === size.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id && i.sizeId === size.id
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          sizeId: size.id,
          quantity,
          name: product.name,
          sizeLabel: size.label,
          unitPriceInPaise: size.priceInPaise,
          image: product.image,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const updateQuantity = useCallback((productId: string, sizeId: string, quantity: number) => {
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => !(i.productId === productId && i.sizeId === sizeId));
      }
      return prev.map((i) =>
        i.productId === productId && i.sizeId === sizeId ? { ...i, quantity } : i,
      );
    });
  }, []);

  const removeItem = useCallback((productId: string, sizeId: string) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.sizeId === sizeId)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  /** Subtotal in INR paise — canonical money type across the app. */
  const subtotal  = items.reduce((sum, i) => sum + i.quantity * i.unitPriceInPaise, 0);

  return (
    <CartContext.Provider
      value={{ items, itemCount, subtotal, isOpen, openCart, closeCart, addItem, updateQuantity, removeItem, clear }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
