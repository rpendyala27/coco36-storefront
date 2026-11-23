import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, setTemplate } from '../../server/render';
import { resetCatalogCache } from '../../server/catalog';
import { mapSupabaseProduct } from '../../src/services/productMapper';
import { canBuy, productAvailability } from '../../src/lib/availability';

/**
 * P37a / F63: the server-rendered /shop and product page say the same thing
 * about availability as the product page buttons, because both read
 * src/lib/availability.ts. Mocked PostgREST, no network.
 */

const PRODUCT_ID = '6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a77';
const CATEGORY_ID = '0b6a3c43-5c47-4b1e-9c38-2a7f2d1a9b77';

const row = (tags: { slug: string; label: string; kind: string }[], inStock = true) => ({
  id: PRODUCT_ID, name: 'Tahitian Vanilla Beans', brand: 'COCO36',
  origin_country: 'French Polynesia', origin_region: null, tag_line: '', description_md: 'Vanilla beans.',
  updated_at: '2026-11-01T00:00:00Z',
  variants: [
    { id: 'v1', size_label: '2 oz (5 beans)', selling_price_paise: 82500, mrp_paise: 82500, in_stock: inStock, sort_order: 0 },
    { id: 'v2', size_label: '4 oz (10 beans)', selling_price_paise: 147500, mrp_paise: 147500, in_stock: inStock, sort_order: 1 },
  ],
  images: [],
  category: { id: CATEGORY_ID, name: 'Vanilla', slug: 'vanilla', parent_id: null },
  product_tags: tags.map((tag) => ({ tag })),
});
const category = { id: CATEGORY_ID, slug: 'vanilla', name: 'Vanilla', parent_id: null, sort_order: 0, image_url: null, description: null };
const COMING_SOON = { slug: 'coming-soon', label: 'Coming Soon', kind: 'designation' };

let current = row([COMING_SOON]);

beforeAll(() => {
  setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
});

beforeEach(() => {
  resetCatalogCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const body = url.includes('/rest/v1/products') ? [current]
      : url.includes('/rest/v1/categories') ? [category]
      : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

const offers = (html: string) => {
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const ld = JSON.parse(m[1]);
    if (ld['@type'] === 'Product') return (Array.isArray(ld.offers) ? ld.offers : ld.offers?.offers ?? [ld.offers]);
  }
  return [];
};

describe('prerender availability matches the product page', () => {
  it('coming soon + in_stock: the page buttons are off, and the snapshot and JSON-LD say coming soon / OutOfStock', async () => {
    current = row([COMING_SOON], true);
    const p = mapSupabaseProduct(current);
    expect(productAvailability(p)).toBe('coming_soon');
    expect(p.sizes.some((s) => canBuy(p, s))).toBe(false);

    const page = await render('/shop/tahitian-vanilla-beans', '', 'coco36.com');
    expect(page.status).toBe(200);
    expect(page.body).toContain('2 oz (5 beans):');
    expect(page.body).not.toContain('— in stock</li>');
    expect(page.body).toContain('— coming soon</li>');
    const o = offers(page.body);
    expect(o.length).toBeGreaterThan(0);
    for (const offer of o) expect(offer.availability).toBe('https://schema.org/OutOfStock');

    const shop = await render('/shop', '', 'coco36.com');
    expect(shop.status).toBe(200);
    expect(shop.body).toContain('(coming soon)');
  });

  it('in stock, no coming-soon tag: buyable on the page, in stock / InStock in the snapshot', async () => {
    current = row([], true);
    const p = mapSupabaseProduct(current);
    expect(productAvailability(p)).toBe('available');
    expect(p.sizes.every((s) => canBuy(p, s))).toBe(true);

    const page = await render('/shop/tahitian-vanilla-beans', '', 'coco36.com');
    expect(page.body).toContain('— in stock</li>');
    for (const offer of offers(page.body)) expect(offer.availability).toBe('https://schema.org/InStock');
    const shop = await render('/shop', '', 'coco36.com');
    expect(shop.body).not.toContain('(coming soon)');
    expect(shop.body).not.toContain('(out of stock)');
  });

  it('every pack out of stock: out of stock in both', async () => {
    current = row([], false);
    const p = mapSupabaseProduct(current);
    expect(productAvailability(p)).toBe('sold_out');
    const page = await render('/shop/tahitian-vanilla-beans', '', 'coco36.com');
    expect(page.body).toContain('— out of stock</li>');
    const shop = await render('/shop', '', 'coco36.com');
    expect(shop.body).toContain('(out of stock)');
  });
});
