import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONCEALED_PRODUCTS_PATH, loadCatalog, parseConcealedProducts, resetCatalogCache } from '../../server/catalog';
import { render, setTemplate } from '../../server/render';
import { sitemapEntries } from '../../server/sitemap';
import { isConcealedProductSlug, productPath, productSlug } from '../../src/lib/productPath';
import type { ConcealedProduct } from '../../src/lib/productPath';

/**
 * Product URLs follow the database, not a slug list.
 *   active (status=active, deleted_at null) → 200
 *   hidden product, service-role key present → 301 /shop
 *   hidden product, service-role key absent (Preview) → 404
 *   no such product → 404
 * The sitemap is built from the active catalogue only. Hidden names stay
 * off the HTML response.
 */

const ACTIVE_ID = '6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01';
const SHOP = 'https://coco36.com/shop';
const SERVICE_KEY = 'service-role-test-key';

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
  { name: 'Tahitian Vanilla Beans', status: 'archived', deleted_at: null },
  { name: 'Ghost Spice', status: 'active', deleted_at: null },
];

let visibilityMode: 'ok' | 'down' | 'throw' = 'ok';
const calls: { url: string; authorization: string }[] = [];
const errorLines: string[] = [];

beforeAll(() => {
  setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
});

beforeEach(() => {
  visibilityMode = 'ok';
  calls.length = 0;
  errorLines.length = 0;
  resetCatalogCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY);
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    const authorization = new Headers(init?.headers).get('authorization') ?? '';
    calls.push({ url, authorization });
    const serviceCall = url.includes('select=name,status,deleted_at') || url.includes('/rest/v1/delivery_zones');
    expect(authorization, url).toBe(serviceCall ? `Bearer ${SERVICE_KEY}` : 'Bearer anon-key');
    if (url.includes('select=name,status,deleted_at')) {
      expect(url).toContain(`/rest/v1/${CONCEALED_PRODUCTS_PATH}`);
      expect(url).not.toMatch(/description|supplier|fssai|gst|hsn|brand|sku|tag_line|origin|\*/);
      if (visibilityMode === 'throw') throw new Error('network down');
      if (visibilityMode === 'down') return new Response('{"message":"unavailable"}', { status: 503 });
      return new Response(JSON.stringify(concealed), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.includes('/rest/v1/products')) {
      expect(url).toContain('status=eq.active');
      expect(url).toContain('deleted_at=is.null');
      expect(authorization).toBe('Bearer anon-key');
      return new Response(JSON.stringify([activeRow]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  });
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errorLines.push(args.map((arg) => String(arg)).join(' '));
  });
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function visibilityCalls() {
  return calls.filter((call) => call.url.includes('select=name,status,deleted_at'));
}

describe('concealed product slug matching', () => {
  it('matches archived, draft and deleted rows, and ignores active rows and unknown slugs', () => {
    expect(isConcealedProductSlug('light-muscovado-cane-sugar', concealed)).toBe(true);
    expect(isConcealedProductSlug('Light-Muscovado-Cane-Sugar', concealed)).toBe(true);
    expect(isConcealedProductSlug('future-honey', concealed)).toBe(true);
    expect(isConcealedProductSlug('removed-couverture', concealed)).toBe(true);
    expect(isConcealedProductSlug('manuka-honey-umf-15', concealed)).toBe(true);
    expect(isConcealedProductSlug('ghost-spice', concealed)).toBe(false);
    expect(isConcealedProductSlug('never-a-product', concealed)).toBe(false);
    expect(CONCEALED_PRODUCTS_PATH).toBe(
      'products?select=name,status,deleted_at&or=(status.neq.active,status.is.null,deleted_at.not.is.null)',
    );
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
  it('serves an active product as 200 without the service-role visibility read', async () => {
    const slug = productSlug({ id: ACTIVE_ID, name: 'Tahitian Vanilla Beans' });
    const res = await render(`/shop/${slug}`, '', 'coco36.com');
    expect(res.status).toBe(200);
    expect(res.headers.Location).toBeUndefined();
    expect(res.body).toContain(`https://coco36.com/shop/${slug}`);
    expect(visibilityCalls()).toEqual([]);
    expect(res.body).not.toContain(SERVICE_KEY);
  });

  it('301s archived, draft and deleted product slugs to /shop when the service role key is set', async () => {
    const names = [
      'Light Muscovado Cane Sugar',
      'Maldon Flaky Sea Salt',
      'Dark Muscovado Cane Sugar',
      'Heritage Sourdough Kit',
      'Future Honey',
      'Removed Couverture',
    ];
    for (const name of names) {
      resetCatalogCache();
      const slug = productSlug({ id: '', name });
      const res = await render(`/shop/${slug}`, '', 'coco36.com');
      expect(res.status, slug).toBe(301);
      expect(res.headers.Location, slug).toBe(SHOP);
      expect(res.body, name).not.toContain(name);
      expect(res.body, name).not.toContain(SERVICE_KEY);
    }
    const hit = visibilityCalls();
    expect(hit.length).toBeGreaterThan(0);
    expect(hit.every((call) => call.authorization === `Bearer ${SERVICE_KEY}`)).toBe(true);
    const mixed = await render('/shop/Light-Muscovado-Cane-Sugar', '', 'coco36.com');
    expect(mixed.status).toBe(301);
    expect(mixed.headers.Location).toBe(SHOP);
    const legacyCatalog = await render('/catalog/maldon-flaky-sea-salt', '', 'coco36.com');
    expect(legacyCatalog.status).toBe(301);
    expect(legacyCatalog.headers.Location).toBe(SHOP);
    expect(legacyCatalog.body).not.toContain('Maldon Flaky Sea Salt');
  });

  it('404s a slug that is not a product', async () => {
    const res = await render('/shop/never-a-product', '', 'coco36.com');
    expect(res.status).toBe(404);
    expect(res.headers.Location).toBeUndefined();
    expect(res.body).toContain('Page not found');
    expect(res.body).not.toContain('Light Muscovado');
    expect(res.body).not.toContain(SERVICE_KEY);
  });

  it('does not redirect a row the database still marks visible', async () => {
    const res = await render('/shop/ghost-spice', '', 'coco36.com');
    expect(res.status).toBe(404);
  });

  it('keeps the legacy static slug at 410 when that spelling is not the current product slug', async () => {
    const res = await render('/shop/ceylon-cinnamon', '', 'coco36.com');
    expect(res.status).toBe(410);
    expect(productSlug({ id: '', name: 'Ceylon Cinnamon Quills' })).toBe('ceylon-cinnamon-quills');
    expect(visibilityCalls()).toEqual([]);
  });

  it('stays a 404, and does not log the key, when the visibility read fails', async () => {
    visibilityMode = 'down';
    const down = await render('/shop/light-muscovado-cane-sugar', '', 'coco36.com');
    expect(down.status).toBe(404);
    expect(errorLines.join('\n')).toContain('product visibility HTTP 503');
    expect(errorLines.join('\n')).not.toContain(SERVICE_KEY);
    expect(errorLines.join('\n')).not.toContain('Light Muscovado');

    resetCatalogCache();
    visibilityMode = 'throw';
    const thrown = await render('/shop/light-muscovado-cane-sugar', '', 'coco36.com');
    expect(thrown.status).toBe(404);
    expect(errorLines.join('\n')).not.toContain(SERVICE_KEY);
  });

  it('404s a hidden slug on Preview, where the service role key is unset, and does not call PostgREST for it', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    resetCatalogCache();
    calls.length = 0;
    const res = await render('/shop/light-muscovado-cane-sugar', '', 'coco36.com');
    expect(res.status).toBe(404);
    expect(res.headers.Location).toBeUndefined();
    expect(visibilityCalls()).toEqual([]);
    expect(calls.every((call) => call.authorization === 'Bearer anon-key')).toBe(true);
    expect(res.body).not.toContain('Light Muscovado');
  });
});

describe('sitemap', () => {
  it('lists the active product and omits hidden slugs', async () => {
    const cat = await loadCatalog();
    const paths = sitemapEntries(cat).map((entry) => entry.path);
    expect(cat.products.map((p) => p.name)).toEqual(['Tahitian Vanilla Beans']);
    expect(paths).toContain(productPath({ id: ACTIVE_ID, name: 'Tahitian Vanilla Beans' }));
    for (const row of concealed) {
      if (row.name === 'Tahitian Vanilla Beans') continue;
      expect(paths, row.name).not.toContain(productPath({ id: '', name: row.name }));
    }
    expect(visibilityCalls()).toEqual([]);
    expect('concealed' in cat).toBe(false);
  });
});
