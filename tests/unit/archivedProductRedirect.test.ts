import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCatalog, parseConcealedProducts, resetCatalogCache } from '../../server/catalog';
import { render, setTemplate } from '../../server/render';
import { sitemapEntries } from '../../server/sitemap';
import { isConcealedProductSlug, productPath, productSlug } from '../../src/lib/productPath';
import type { ConcealedProduct } from '../../src/lib/productPath';

/**
 * Product URLs follow the database, not a slug list.
 *   active (status=active, deleted_at null) → 200
 *   concealed (archived, draft, deleted, or any other non-active status) → 301 /shop
 *   no such product → 404
 * The sitemap is built from the active catalogue only.
 */

const ACTIVE_ID = '6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01';
const SHOP = 'https://coco36.com/shop';

const activeRow = {
  id: ACTIVE_ID,
  name: 'Tahitian Vanilla Beans',
  brand: 'COCO36',
  origin_country: 'French Polynesia',
  origin_region: 'Tahaa',
  tag_line: '',
  description_md: 'Whole beans.',
  updated_at: '2026-11-01T00:00:00Z',
  variants: [{ id: 'v1', size_label: '2 beans', selling_price_paise: 120000, mrp_paise: 120000, in_stock: true, sort_order: 0 }],
  images: [{ id: 'i1', url: 'https://res.cloudinary.com/demo/image/upload/v1/vanilla.jpg', is_primary: true, sort_order: 0, alt_text: 'Vanilla' }],
  category: null,
  product_tags: [],
};

const concealed: ConcealedProduct[] = [
  { name: 'Light Muscovado Cane Sugar', status: 'archived', deleted_at: null },
  { name: 'Maldon Flaky Sea Salt', status: 'archived', deleted_at: null },
  { name: 'Dark Muscovado Cane Sugar', status: 'archived', deleted_at: null },
  { name: 'Heritage Sourdough Kit', status: 'archived', deleted_at: null },
  { name: 'Future Honey', status: 'draft', deleted_at: null },
  { name: 'Removed Couverture', status: 'active', deleted_at: '2026-11-01T00:00:00Z' },
  { name: 'Ceylon Cinnamon Quills', status: 'archived', deleted_at: null },
  { name: 'Mānuka Honey UMF 15+', status: 'archived', deleted_at: null },
  // Stale row for the live product. The active catalogue wins.
  { name: 'Tahitian Vanilla Beans', status: 'archived', deleted_at: null },
  // Status says this is still public, and it is not in the live catalogue.
  { name: 'Ghost Spice', status: 'active', deleted_at: null },
];

let concealedStatus = 200;

beforeAll(() => {
  setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
});

beforeEach(() => {
  concealedStatus = 200;
  resetCatalogCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const authorization = new Headers(init?.headers).get('authorization') ?? '';
    expect(authorization, url).toBe('Bearer anon-key');
    expect(authorization, url).not.toContain('service');
    if (url.includes('rpc/storefront_concealed_products')) {
      if (concealedStatus !== 200) return new Response('{"message":"unavailable"}', { status: concealedStatus });
      return new Response(JSON.stringify(concealed), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const body = url.includes('/rest/v1/products') ? [activeRow]
      : url.includes('/rest/v1/categories') ? []
      : url.includes('/rest/v1/settings') ? []
      : [];
    if (url.includes('/rest/v1/products')) {
      expect(url).toContain('status=eq.active');
      expect(url).toContain('deleted_at=is.null');
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('concealed product slug matching', () => {
  it('matches archived, draft and deleted rows, and ignores active rows and unknown slugs', () => {
    expect(isConcealedProductSlug('light-muscovado-cane-sugar', concealed)).toBe(true);
    expect(isConcealedProductSlug('Light-Muscovado-Cane-Sugar', concealed)).toBe(true);
    expect(isConcealedProductSlug('future-honey', concealed)).toBe(true);
    expect(isConcealedProductSlug('removed-couverture', concealed)).toBe(true);
    expect(isConcealedProductSlug('manuka-honey-umf-15', concealed)).toBe(true);
    expect(isConcealedProductSlug('ghost-spice', concealed)).toBe(false);
    expect(isConcealedProductSlug('never-a-product', concealed)).toBe(false);
    expect(isConcealedProductSlug('tahitian-vanilla-beans', concealed)).toBe(true);
  });

  it('drops rows that have no name', () => {
    expect(parseConcealedProducts([
      { name: '  ', status: 'archived', deleted_at: null },
      { name: 'Dark Muscovado Cane Sugar', status: 'archived', deleted_at: null },
      { status: 'archived' },
      null,
    ])).toEqual([{ name: 'Dark Muscovado Cane Sugar', status: 'archived', deleted_at: null }]);
  });
});

describe('product URL status', () => {
  it('serves an active product as 200', async () => {
    const slug = productSlug({ id: ACTIVE_ID, name: 'Tahitian Vanilla Beans' });
    const res = await render(`/shop/${slug}`, '', 'coco36.com');
    expect(res.status).toBe(200);
    expect(res.headers.Location).toBeUndefined();
    expect(res.body).toContain(`https://coco36.com/shop/${slug}`);
  });

  it('301s archived, draft and deleted product slugs to /shop', async () => {
    const names = [
      'Light Muscovado Cane Sugar',
      'Maldon Flaky Sea Salt',
      'Dark Muscovado Cane Sugar',
      'Heritage Sourdough Kit',
      'Future Honey',
      'Removed Couverture',
    ];
    for (const name of names) {
      const slug = productSlug({ id: '', name });
      const res = await render(`/shop/${slug}`, '', 'coco36.com');
      expect(res.status, slug).toBe(301);
      expect(res.headers.Location, slug).toBe(SHOP);
    }
    const mixed = await render('/shop/Light-Muscovado-Cane-Sugar', '', 'coco36.com');
    expect(mixed.status).toBe(301);
    expect(mixed.headers.Location).toBe(SHOP);
    const legacyCatalog = await render('/catalog/maldon-flaky-sea-salt', '', 'coco36.com');
    expect(legacyCatalog.status).toBe(301);
    expect(legacyCatalog.headers.Location).toBe(SHOP);
  });

  it('404s a slug that is not a product', async () => {
    const res = await render('/shop/never-a-product', '', 'coco36.com');
    expect(res.status).toBe(404);
    expect(res.headers.Location).toBeUndefined();
    expect(res.body).toContain('not found');
  });

  it('does not redirect a row the database still marks visible', async () => {
    const res = await render('/shop/ghost-spice', '', 'coco36.com');
    expect(res.status).toBe(404);
  });

  it('keeps the legacy static slug at 410 when that spelling is not the current product slug', async () => {
    const res = await render('/shop/ceylon-cinnamon', '', 'coco36.com');
    expect(res.status).toBe(410);
    expect(productSlug({ id: '', name: 'Ceylon Cinnamon Quills' })).toBe('ceylon-cinnamon-quills');
  });

  it('stays a 404 when the concealed-product read fails', async () => {
    concealedStatus = 503;
    const res = await render('/shop/light-muscovado-cane-sugar', '', 'coco36.com');
    expect(res.status).toBe(404);
  });
});

describe('sitemap', () => {
  it('lists the active product and omits concealed slugs', async () => {
    const cat = await loadCatalog();
    const paths = sitemapEntries(cat).map((entry) => entry.path);
    expect(cat.products.map((p) => p.name)).toEqual(['Tahitian Vanilla Beans']);
    expect(paths).toContain(productPath({ id: ACTIVE_ID, name: 'Tahitian Vanilla Beans' }));
    for (const row of concealed) {
      if (row.name === 'Tahitian Vanilla Beans') continue;
      expect(paths, row.name).not.toContain(productPath({ id: '', name: row.name }));
    }
    expect(cat.concealed?.map((row) => row.name)).toContain('Heritage Sourdough Kit');
    expect(cat.products.map((p) => productSlug(p))).not.toContain('heritage-sourdough-kit');
  });
});
