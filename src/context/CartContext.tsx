import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { CartItem, Product, ProductSize } from '../types';
import { trackAddToCart } from '../lib/analytics';
import { API_URL } from '../lib/supabase';
import { availableFor, clampQty, fetchStock, sellableSubtotal, stockIds, type Stock } from '../lib/stock';

import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { cartVariantIds, splitArchived, type LiveVariantReader } from '../lib/cartReconcile';

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
  /** Lines dropped because their product was archived or deleted (F18), for a one-time notice. */
  removedLines: CartItem[];
  dismissRemovedLines: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'coco36-cart';

/** Packs the shop still sells, by the anon read (P31 policy hides archived products' packs). Null on any failure. */
const readLiveVariants: LiveVariantReader = async (ids) => {
  if (!isSupabaseConfigured || ids.length === 0) return null;
  try {
    const { data, error } = await supabase.from('product_variants').select('id').in('id', ids).is('deleted_at', null);
    if (error || !data) return null;
    return new Set(data.map((r: { id: string }) => r.id));
  } catch {
    return null;
  }
};

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
  const itemsRef = useRef(items);
  itemsRef.current = items;

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

  // ── Archived packs: drop them from a saved cart with a notice (F18) ──────
  const [removedLines, setRemovedLines] = useState<CartItem[]>([]);
  const variantKey = cartVariantIds(items).join(',');
  useEffect(() => {
    if (!variantKey) return undefined;
    let live = true;
    void readLiveVariants(variantKey.split(',')).then((liveIds) => {
      if (!live || !liveIds) return;
      setItems((prev) => {
        const { keep, removed } = splitArchived(prev, liveIds);
        if (!removed.length) return prev;
        // Keyed by pack id: a strict-mode double run of this updater adds nothing twice.
        setRemovedLines((r) => [...r, ...removed.filter((x) => !r.some((y) => y.sizeId === x.sizeId))]);
        return keep;
      });
    });
    return () => { live = false; };
  }, [variantKey, tick]);
  const dismissRemovedLines = useCallback(() => setRemovedLines([]), []);

  const openCart = useCallback(() => { setIsOpen(true); setTick((t) => t + 1); }, []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((product: Product, size: ProductSize, quantity = 1) => {
    const cap = availableFor(stockRef.current, size.id);
    const prev = itemsRef.current;
    const existing = prev.find((i) => i.productId === product.id && i.sizeId === size.id);
    let addedQty = 0;
    let next: CartItem[];
    if (existing) {
      const q = Math.max(existing.quantity, clampQty(existing.quantity + quantity, cap));
      addedQty = q - existing.quantity;
      next = prev.map((i) =>
        i.productId === product.id && i.sizeId === size.id
          ? { ...i, quantity: q, sku: i.sku ?? size.sku }
          : i,
      );
    } else {
      addedQty = cap ? clampQty(quantity, cap) : quantity;
      next = [
        ...prev,
        {
          productId: product.id,
          sizeId: size.id,
          // Unknown or sold-out stock: add as asked; the fetch that follows caps it or flags it.
          quantity: addedQty,
          name: product.name,
          sizeLabel: size.label,
          unitPriceInPaise: size.priceInPaise,
          image: product.image,
          ...(size.sku ? { sku: size.sku } : {}),
        },
      ];
    }
    itemsRef.current = next;
    setItems(next);
    if (addedQty > 0) {
      trackAddToCart({
        sku: size.sku ?? '',
        name: product.name,
        variant: size.label,
        unitPricePaise: size.priceInPaise,
        quantity: addedQty,
      });
    }
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
      value={{ items, itemCount, subtotal, isOpen, openCart, closeCart, addItem, updateQuantity, removeItem, clear, stock, refreshStock, removedLines, dismissRemovedLines }}
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
