import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CartItem } from '../../src/types';
import type { Stock } from '../../src/lib/stock';

/**
 * P37a: one cart total for the drawer, /cart and checkout (F17), archived
 * lines dropped with a notice (F18), and no shipping or threshold lines on an
 * empty or all-sold-out cart (F19).
 */

const cart: { items: CartItem[]; stock: Stock | null; removedLines: CartItem[] } = { items: [], stock: null, removedLines: [] };
vi.mock('../../src/context/CartContext', () => ({
  useCart: () => ({
    items: cart.items, stock: cart.stock, removedLines: cart.removedLines,
    isOpen: true, closeCart: () => {}, openCart: () => {}, updateQuantity: () => {}, removeItem: () => {},
    refreshStock: () => {}, dismissRemovedLines: () => {}, addItem: () => {}, clear: () => {},
    subtotal: -1, itemCount: -1, // never read by the drawer or /cart any more
  }),
}));
vi.mock('../../src/lib/supabase', () => ({ API_URL: 'https://admin.example.test', supabase: {} }));

const { summarizeCart } = await import('../../src/lib/cartSummary');
const { splitArchived, removedLinesNotice, cartVariantIds } = await import('../../src/lib/cartReconcile');
const { CartDrawer } = await import('../../src/components/CartDrawer');
const { CartPage } = await import('../../src/pages/Cart');
const { DEFAULT_CONFIG } = await import('../../src/lib/storeConfig');

const A = '55555555-5555-4555-8555-555555555551';
const B = '55555555-5555-4555-8555-555555555552';
const GONE = '55555555-5555-4555-8555-555555555553';

const line = (sizeId: string, quantity: number, price: number, name = 'Item'): CartItem =>
  ({ productId: `p-${sizeId}`, sizeId, quantity, name, sizeLabel: '250 g', unitPriceInPaise: price, image: '' });

const cfg = { ...DEFAULT_CONFIG, freeShippingPaise: 120000, flatShippingPaise: 9900 };

beforeEach(() => { cart.items = []; cart.stock = null; cart.removedLines = []; });

const text = (html: string, id: string) =>
  html.match(new RegExp(`data-testid="${id}"[^>]*>([^<]*)<`))?.[1] ?? null;
const drawer = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CartDrawer)));
const page = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CartPage)));

describe('summarizeCart', () => {
  it('counts sellable units only and flags sold-out lines', () => {
    const items = [line(A, 2, 50000), line(B, 1, 62300)];
    const stock = { available: { [A]: 20, [B]: 0 }, maxShown: 20 };
    const s = summarizeCart(items, stock, cfg);
    expect(s.subtotal).toBe(100000);
    expect(s.soldOutCount).toBe(1);
    expect(s.lines.map((l) => l.soldOut)).toEqual([false, true]);
    expect(s.lines[1].note).toBe('Sold out');
    expect(s.shipping).toBe(9900);
    expect(s.total).toBe(109900);
    expect(s.freeShipping).toEqual({ remaining: 20000, progress: 83 });
  });

  it('empty cart: no shipping, no threshold, total 0 (F19)', () => {
    const s = summarizeCart([], null, cfg);
    expect(s.isEmpty).toBe(true);
    expect(s.shipping).toBeNull();
    expect(s.freeShipping).toBeNull();
    expect(s.total).toBe(0);
  });

  it('every line sold out: no shipping, no threshold, no COD fee', () => {
    const s = summarizeCart([line(B, 1, 62300)], { available: { [B]: 0 }, maxShown: 20 }, cfg, { codFeePaise: 5000 });
    expect(s.isEmpty).toBe(false);
    expect(s.shipping).toBeNull();
    expect(s.freeShipping).toBeNull();
    expect(s.codFee).toBe(0);
    expect(s.total).toBe(0);
  });

  it('adds the COD fee only when something is sellable', () => {
    expect(summarizeCart([line(A, 1, 150000)], null, cfg, { codFeePaise: 5000 }).total).toBe(155000);
  });
});

describe('drawer and /cart show the same numbers (F17)', () => {
  it('same subtotal, shipping, total and sold-out flags for the same cart', () => {
    cart.items = [line(A, 2, 50000, 'Cocoa'), line(B, 1, 62300, 'Muscovado')];
    cart.stock = { available: { [A]: 20, [B]: 0 }, maxShown: 20 };
    const d = drawer();
    const c = page();
    expect(text(d, 'cart-subtotal')).toBe('₹1,000');
    expect(text(d, 'cart-total')).toBe(text(c, 'cart-total'));
    expect(text(d, 'cart-subtotal')).toBe(text(c, 'cart-subtotal'));
    expect(d).toContain('data-testid="cart-sold-out"');
    expect(c).toContain('data-testid="cart-sold-out"');
    expect((d.match(/>Sold out</g) ?? []).length).toBe(1);
    expect((c.match(/>Sold out</g) ?? []).length).toBe(1);
  });

  it('all sold out: neither shows a shipping line or the free-shipping bar (F19)', () => {
    cart.items = [line(B, 1, 62300)];
    cart.stock = { available: { [B]: 0 }, maxShown: 20 };
    for (const html of [drawer(), page()]) {
      expect(html).not.toContain('data-testid="cart-shipping"');
      expect(html).not.toContain('data-testid="free-shipping"');
      expect(html).not.toContain('more for');
    }
  });

  it('empty: no summary at all in either', () => {
    for (const html of [drawer(), page()]) {
      expect(html).toContain('Your cart is empty');
      expect(html).not.toContain('data-testid="cart-shipping"');
      expect(html).not.toContain('free shipping');
    }
  });

  it('checkout uses the same summary and hides shipping and the threshold the same way', () => {
    const src = readFileSync(path.resolve(__dirname, '../../src/pages/Checkout.tsx'), 'utf8');
    expect(src).toContain('summarizeCart(items, stock, cfg,');
    expect(src).toContain('totals.shipping_paise !== null &&');
    expect(src).toContain('summary.freeShipping && summary.freeShipping.remaining > 0');
    expect(src).not.toMatch(/shippingFor\(/);
  });
});

describe('archived lines (F18)', () => {
  it('drops packs the anon read no longer returns, keeps the rest and older catalogue ids', () => {
    const items = [line(A, 1, 1), line(GONE, 1, 62300, 'Muscovado Cane Sugar'), line('static-sm', 1, 1)];
    const { keep, removed } = splitArchived(items, new Set([A]));
    expect(keep.map((i) => i.sizeId)).toEqual([A, 'static-sm']);
    expect(removed.map((i) => i.sizeId)).toEqual([GONE]);
  });

  it('a failed read drops nothing', () => {
    const items = [line(A, 1, 1), line(GONE, 1, 1)];
    expect(splitArchived(items, null)).toEqual({ keep: items, removed: [] });
  });

  it('asks only about real variant ids, once each', () => {
    expect(cartVariantIds([line(B, 1, 1), line(A, 1, 1), line(A, 2, 1), line('static-sm', 1, 1)])).toEqual([A, B]);
  });

  it('the notice names what was removed', () => {
    expect(removedLinesNotice([])).toBeNull();
    expect(removedLinesNotice([line(GONE, 1, 1, 'Muscovado Cane Sugar')]))
      .toBe('Muscovado Cane Sugar (250 g) is no longer sold, so we took it out of your bag.');
    expect(removedLinesNotice([line(A, 1, 1, 'A'), line(B, 1, 1, 'B'), line(GONE, 1, 1, 'C')]))
      .toBe('A (250 g), B (250 g) and C (250 g) are no longer sold, so we took them out of your bag.');
  });

  it('drawer and /cart both show the notice', () => {
    cart.items = [line(A, 1, 50000)];
    cart.removedLines = [line(GONE, 1, 62300, 'Muscovado Cane Sugar')];
    expect(drawer()).toContain('Muscovado Cane Sugar (250 g) is no longer sold');
    expect(page()).toContain('Muscovado Cane Sugar (250 g) is no longer sold');
  });

  it('CartContext reads live packs through the P31-safe anon columns only (id, deleted_at)', () => {
    const src = readFileSync(path.resolve(__dirname, '../../src/context/CartContext.tsx'), 'utf8');
    expect(src).toContain(".from('product_variants').select('id').in('id', ids).is('deleted_at', null)");
  });
});
