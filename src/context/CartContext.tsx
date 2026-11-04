import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { CartItem, Product, ProductSize } from '../types';
import { API_URL } from '../lib/supabase';
import { availableFor, clampQty, fetchStock, sellableSubtotal, stockIds, type Stock } from '../lib/stock';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  /** Subtotal of sellable units only (paise): sold-out units never count toward free shipping or totals. */
  subtotal: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size: ProductSize, quantity?: number) => void;
  updateQuantity: (productId: string, sizeId: string, quantity: number) => void;
  removeItem: (productId: string, sizeId: string) => void;
  clear: () => void;
  /** Latest stock for the cart's packs, or null while unknown (then nothing is capped). */
  stock: Stock | null;
  /** Re-read stock now (cart opened, checkout loaded). */
  refreshStock: () => void;
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
  const [stock, setStock] = useState<Stock | null>(null);
  const stockRef = useRef<Stock | null>(null);
  stockRef.current = stock;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* quota or private mode */ }
  }, [items]);

  // ── Stock: fetch when the set of packs changes, or on demand ──────────────
  const idsKey = stockIds(items).join(',');
  const [tick, setTick] = useState(0);
  const refreshStock = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let live = true;
    fetchStock(API_URL, idsKey ? idsKey.split(',') : []).then((s) => {
      if (!live || !s) return;
      setStock(s);
      // Cap lines above what's sellable. A sold-out line (0) stays so the
      // shopper sees why; it counts for nothing and blocks checkout.
      setItems((prev) => {
        let changed = false;
        const next = prev.map((i) => {
          const n = availableFor(s, i.sizeId);
          if (n !== undefined && n > 0 && i.quantity > n) { changed = true; return { ...i, quantity: n }; }
          return i;
        });
        return changed ? next : prev;
      });
    });
    return () => { live = false; };
  }, [idsKey, tick]);

  const openCart = useCallback(() => { setIsOpen(true); setTick((t) => t + 1); }, []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((product: Product, size: ProductSize, quantity = 1) => {
    const cap = availableFor(stockRef.current, size.id);
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id && i.sizeId === size.id);
      if (existing) {
        const q = Math.max(existing.quantity, clampQty(existing.quantity + quantity, cap));
        return prev.map((i) =>
          i.productId === product.id && i.sizeId === size.id ? { ...i, quantity: q } : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          sizeId: size.id,
          // Unknown or sold-out stock: add as asked; the fetch that follows caps it or flags it.
          quantity: cap ? clampQty(quantity, cap) : quantity,
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
    const cap = availableFor(stockRef.current, sizeId);
    setItems((prev) => {
      if (quantity <= 0) {
        return prev.filter((i) => !(i.productId === productId && i.sizeId === sizeId));
      }
      return prev.map((i) => {
        if (!(i.productId === productId && i.sizeId === sizeId)) return i;
        // Never raise past the cap; lowering is always allowed (even on a sold-out line).
        const q = quantity > i.quantity && cap !== undefined ? Math.min(quantity, Math.max(cap, i.quantity)) : quantity;
        return { ...i, quantity: q };
      });
    });
  }, []);

  const removeItem = useCallback((productId: string, sizeId: string) => {
    setItems((prev) => prev.filter((i) => !(i.productId === productId && i.sizeId === sizeId)));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  /** Subtotal in INR paise — canonical money type across the app. Sellable units only. */
  const subtotal  = sellableSubtotal(items, stock);

  return (
    <CartContext.Provider
      value={{ items, itemCount, subtotal, isOpen, openCart, closeCart, addItem, updateQuantity, removeItem, clear, stock, refreshStock }}
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
