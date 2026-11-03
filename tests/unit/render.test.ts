import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, setTemplate } from '../../server/render';
import { resetCatalogCache } from '../../server/catalog';

/**
 * Smoke test of the HTML router (api/render → server/render.ts) against a
 * mocked PostgREST: status codes, canonical, robots, titles and JSON-LD for
 * the main page types. No network.
 */

const PRODUCT_ID = '6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01';
const CATEGORY_ID = '0b6a3c43-5c47-4b1e-9c38-2a7f2d1a9b01';

const product = {
  id: PRODUCT_ID, sku: 'VAN-001', name: 'Madagascar Bourbon Vanilla Beans', brand: 'COCO36',
  origin_country: 'Madagascar', origin_region: 'SAVA', tag_line: 'Grade A beans',
  description_md: 'Plump, oily Grade A vanilla beans from the SAVA region.', updated_at: '2026-10-01T00:00:00Z',
  variants: [{ id: 'v1', size_label: '5 beans', selling_price_paise: 89900, mrp_paise: 99900, in_stock: true, sort_order: 0 }],
  images: [{ id: 'i1', url: 'https://res.cloudinary.com/demo/image/upload/v1/vanilla.jpg', is_primary: true, sort_order: 0, alt_text: 'Vanilla beans' }],
  category: { id: CATEGORY_ID, name: 'Vanilla', slug: 'vanilla', parent_id: null },
  product_tags: [],
};
const category = { id: CATEGORY_ID, slug: 'vanilla', name: 'Vanilla', parent_id: null, sort_order: 0, image_url: null, description: null };

let supabaseDown = false;

beforeAll(() => {
  setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
});

beforeEach(() => {
  supabaseDown = false;
  resetCatalogCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (supabaseDown) throw new TypeError('fetch failed');
    const url = String(input);
    const body = url.includes('/rest/v1/products') ? [product]
      : url.includes('/rest/v1/categories') ? [category]
      : url.includes('/rest/v1/settings') ? [{ key: 'shipping.free_threshold_paise', value: 250000 }]
      : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

const canonical = (html: string) => html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
const robots = (html: string) => html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? null;
const title = (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
const titles = (html: string) => html.match(/<title>/g)?.length ?? 0;
const ldTypes = (html: string) =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])['@type']);

describe('server-rendered pages', () => {
  it('home: 200, one title, canonical /, Organization + WebSite JSON-LD', async () => {
    const r = await render('/', '', 'coco36.com');
    expect(r.status).toBe(200);
    expect(titles(r.body)).toBe(1);
    expect(title(r.body)).toMatch(/COCO36/);
    expect(canonical(r.body)).toBe('https://coco36.com/');
    expect(robots(r.body)).toBeNull();
    expect(ldTypes(r.body)).toEqual(expect.arrayContaining(['Organization', 'WebSite']));
  });

  it('product: 200, canonical slug URL, Product JSON-LD in INR', async () => {
    const r = await render('/shop/madagascar-bourbon-vanilla-beans', '', 'coco36.com');
    expect(r.status).toBe(200);
    expect(canonical(r.body)).toBe('https://coco36.com/shop/madagascar-bourbon-vanilla-beans');
    expect(ldTypes(r.body)).toEqual(expect.arrayContaining(['Product', 'BreadcrumbList']));
    expect(r.body).toContain('"priceCurrency":"INR"');
  });

  it('legacy UUID product URL: 301 to the slug', async () => {
    const r = await render(`/shop/${PRODUCT_ID}`, '', 'coco36.com');
    expect(r.status).toBe(301);
    expect(r.headers.Location).toBe('https://coco36.com/shop/madagascar-bourbon-vanilla-beans');
  });

  it('removed product (legacy slug whose successor is not live): 410 noindex', async () => {
    const r = await render('/shop/ceylon-cinnamon', '', 'coco36.com');
    expect(r.status).toBe(410);
    expect(robots(r.body)).toBe('noindex');
  });

  it('unknown URL: 404 noindex, no canonical', async () => {
    const r = await render('/no-such-page', '', 'coco36.com');
    expect(r.status).toBe(404);
    expect(robots(r.body)).toBe('noindex');
    expect(canonical(r.body)).toBeNull();
  });

  it('/auth and /recipes: 200 but noindex', async () => {
    for (const p of ['/auth', '/recipes']) {
      const r = await render(p, '', 'coco36.com');
      expect(r.status, p).toBe(200);
      expect(robots(r.body), p).toMatch(/noindex/);
    }
  });

  it('preview hosts are never indexable', async () => {
    const r = await render('/', '', 'coco36-storefront-git-x.vercel.app');
    expect(r.headers['X-Robots-Tag']).toBe('noindex');
  });

  it('www: 301 to the apex', async () => {
    const r = await render('/shop', '', 'www.coco36.com');
    expect(r.status).toBe(301);
    expect(r.headers.Location).toBe('https://coco36.com/shop');
  });

  it('database down: 503 with Retry-After (not a soft 404)', async () => {
    supabaseDown = true;
    const r = await render('/shop', '', 'coco36.com');
    expect(r.status).toBe(503);
    expect(r.headers['Retry-After']).toBe('120');
  });
});
