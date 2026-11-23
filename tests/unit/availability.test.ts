import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Product, ProductSize } from '../../src/types';

/**
 * P37a / R13: one availability source for the product page buttons, /shop
 * cards, Quick order, the snapshot, JSON-LD and Notify me (F16, F63).
 */

vi.mock('../../src/context/CartContext', () => ({ useCart: () => ({ addItem: () => {} }) }));
vi.mock('../../src/lib/supabase', () => ({ API_URL: 'https://admin.example.test', supabase: {} }));

const {
  AVAILABILITY_TEXT, allPacksOut, buyableSizes, canBuy, isComingSoon, productAvailability, schemaAvailability, sizeAvailability,
} = await import('../../src/lib/availability');
const { liveStockFor, requestLiveStock, resetLiveStock } = await import('../../src/lib/liveStock');
const { ProductCard } = await import('../../src/components/ProductCard');

const V1 = '33333333-3333-4333-8333-333333333331';
const V2 = '33333333-3333-4333-8333-333333333332';

const comingSoonTag = { slug: 'coming-soon', label: 'Coming Soon', kind: 'designation' as const };
const sizes = (a = true, b = true): ProductSize[] => [
  { id: V1, label: '2 oz', priceInPaise: 82500, inStock: a },
  { id: V2, label: '4 oz', priceInPaise: 147500, inStock: b },
];
const product = (partial: Partial<Product> = {}): Product => ({
  id: 'vanilla', name: 'Tahitian Vanilla Beans', brand: 'COCO36', origin: 'French Polynesia', tag: '', image: '',
  category: 'Vanilla', description: '', sizes: sizes(), tags: [], ...partial,
});

afterEach(() => { vi.restoreAllMocks(); resetLiveStock(); });

describe('availability rules', () => {
  it('coming soon wins over in_stock: nothing is buyable (F16)', () => {
    const p = product({ tags: [comingSoonTag] });
    expect(isComingSoon(p)).toBe(true);
    expect(productAvailability(p)).toBe('coming_soon');
    expect(sizeAvailability(p, p.sizes[0])).toBe('coming_soon');
    expect(canBuy(p, p.sizes[0])).toBe(false);
    expect(buyableSizes(p)).toEqual([]);
  });

  it('only a designation-kind coming-soon tag counts', () => {
    expect(isComingSoon(product({ tags: [{ ...comingSoonTag, kind: 'attribute' }] }))).toBe(false);
  });

  it('live sellable units of 0 make an in_stock pack sold out; unknown or "20 or more" leave it buyable', () => {
    const p = product();
    const stock = { available: { [V1]: 0, [V2]: 20 }, maxShown: 20 };
    expect(sizeAvailability(p, p.sizes[0], stock)).toBe('sold_out');
    expect(sizeAvailability(p, p.sizes[1], stock)).toBe('available');
    expect(sizeAvailability(p, p.sizes[0], null)).toBe('available');
    expect(buyableSizes(p, stock).map((s) => s.id)).toEqual([V2]);
    expect(productAvailability(p, { available: { [V1]: 0, [V2]: 0 }, maxShown: 20 })).toBe('sold_out');
  });

  it('in_stock false is sold out even with no live stock; a product with no packs is not called sold out', () => {
    expect(productAvailability(product({ sizes: sizes(false, false) }))).toBe('sold_out');
    expect(productAvailability(product({ sizes: sizes(false, true) }))).toBe('available');
    expect(productAvailability(product({ sizes: [] }))).toBe('available');
    expect(canBuy(product(), undefined)).toBe(false);
  });

  it('the image wash follows the packs, not the tag: sold out + coming soon keeps it, coming soon alone does not', () => {
    expect(allPacksOut(product({ tags: [comingSoonTag], sizes: sizes(false, false) }))).toBe(true);
    expect(allPacksOut(product({ tags: [comingSoonTag] }))).toBe(false);
    expect(allPacksOut(product(), { available: { [V1]: 0, [V2]: 0 }, maxShown: 20 })).toBe(true);
  });

  it('words and schema.org values come from the same answer', () => {
    expect(AVAILABILITY_TEXT).toEqual({ available: 'in stock', coming_soon: 'coming soon', sold_out: 'out of stock' });
    expect(schemaAvailability('available')).toBe('https://schema.org/InStock');
    expect(schemaAvailability('coming_soon')).toBe('https://schema.org/OutOfStock');
    expect(schemaAvailability('sold_out')).toBe('https://schema.org/OutOfStock');
  });
});

describe('/shop card', () => {
  const card = (p: Product) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(ProductCard, { product: p })));

  it('coming soon: Notify me with the coming-soon note, no Add button (F16, F63)', () => {
    const html = card(product({ tags: [comingSoonTag] }));
    expect(html).toContain('Notify me');
    expect(html).not.toMatch(/>\s*Add(<span|\s*<\/button>)/);
  });

  it('in stock: Add button, no Notify me', () => {
    const html = card(product());
    expect(html).toContain('btn-primary');
    expect(html).toMatch(/Add/);
    expect(html).not.toContain('Notify me');
  });
});

describe('product page wiring', () => {
  const src = readFileSync(path.resolve(__dirname, '../../src/pages/ProductDetail.tsx'), 'utf8');

  it('Add to bag, Buy now and the sticky bar are gated by canBuy; Notify me takes their place (F16)', () => {
    expect(src).toContain("const buyable         = canBuy(product, selectedSize, liveStock);");
    expect(src).toContain('selectedSize && !buyable ? (');
    expect(src).toContain('{buyable ? (');
    expect(src).toContain('const handleAddToCart = () => { if (buyable && selectedSize)');
    expect(src).toContain('const handleBuyNow    = () => { if (buyable && selectedSize)');
    expect(src.match(/<NotifyMe productKey=\{product\.id\} productName=\{product\.name\} comingSoon=\{comingSoon\}/g)?.length).toBe(2);
    expect(src).not.toContain('selectedSize.inStock');
  });

  it('reads live stock for its own packs', () => {
    expect(src).toContain('useLiveStock(product ? product.sizes.map((s) => s.id) : [])');
  });
});

describe('Quick order', () => {
  it('uses canBuy, and says coming soon for a coming-soon pack', () => {
    const src = readFileSync(path.resolve(__dirname, '../../src/pages/QuickOrder.tsx'), 'utf8');
    expect(src).toContain('if (!canBuy(p, size))');
    expect(src).toContain("isComingSoon(p) ? 'soon' : 'oos'");
  });
});

describe('live stock loader', () => {
  it('merges requests in the same tick into one call of at most 50 ids, then serves from cache', async () => {
    const ids = Array.from({ length: 60 }, (_, i) => `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`);
    const fetcher = vi.fn(async (_api: string, batch: string[]) => ({
      available: Object.fromEntries(batch.map((id) => [id, 3])), maxShown: 20,
    }));
    const a = requestLiveStock(ids.slice(0, 30), fetcher);
    const b = requestLiveStock(ids.slice(30), fetcher);
    await Promise.all([a, b]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1]).toHaveLength(50);
    expect(fetcher.mock.calls[1][1]).toHaveLength(10);
    expect(liveStockFor([ids[0]])).toEqual({ available: { [ids[0]]: 3 }, maxShown: 20 });
    await requestLiveStock(ids, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('ignores non-UUID ids and a failed fetch leaves stock unknown', async () => {
    const fetcher = vi.fn(async (_api: string, _ids: string[]) => null);
    await requestLiveStock(['static-sm', V1], fetcher);
    expect(fetcher.mock.calls[0][1]).toEqual([V1]);
    expect(liveStockFor([V1])).toBeNull();
  });
});
