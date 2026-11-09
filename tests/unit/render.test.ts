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
  id: PRODUCT_ID, name: 'Madagascar Bourbon Vanilla Beans', brand: 'COCO36',
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

  it('/shop is self-canonical, including when a tracking param is present', async () => {
    const plain = await render('/shop', '', 'coco36.com');
    expect(plain.status).toBe(200);
    expect(canonical(plain.body)).toBe('https://coco36.com/shop');
    expect(robots(plain.body)).toBeNull();
    expect(plain.body).toContain('sourced direct from origin');
    const tracked = await render('/shop', 'utm_source=google', 'coco36.com');
    expect(tracked.status).toBe(200);
    expect(canonical(tracked.body)).toBe('https://coco36.com/shop');
  });

  it('empty /shop?q= and a trailing slash redirect to the bare shop URL', async () => {
    const empty = await render('/shop', 'q=', 'coco36.com');
    expect(empty.status).toBe(301);
    expect(empty.headers.Location).toBe('https://coco36.com/shop');
    const slash = await render('/shop/', '', 'coco36.com');
    expect(slash.status).toBe(301);
    expect(slash.headers.Location).toBe('https://coco36.com/shop');
  });

  it('a real shop search stays noindex and still canonicalises to /shop', async () => {
    const r = await render('/shop', 'q=vanilla', 'coco36.com');
    expect(r.status).toBe(200);
    expect(robots(r.body)).toMatch(/noindex/);
    expect(canonical(r.body)).toBe('https://coco36.com/shop');
  });

  it('info pages: 200, self-canonical, breadcrumb, footer links', async () => {
    for (const p of ['/about', '/contact', '/faq', '/shipping', '/returns']) {
      const r = await render(p, '', 'coco36.com');
      expect(r.status, p).toBe(200);
      expect(canonical(r.body), p).toBe(`https://coco36.com${p}`);
      expect(robots(r.body), p).toBeNull();
      expect(ldTypes(r.body), p).toContain('BreadcrumbList');
      expect(r.body, p).toContain(`href="${p}"`);
      expect(r.body, p).toContain('href="/contact"');
    }
  });

  it('/contact publishes email and phone as links and has no form', async () => {
    const r = await render('/contact', '', 'coco36.com');
    expect(r.body).toContain('href="mailto:support@coco36.com"');
    expect(r.body).toContain('href="tel:+919944213233"');
    expect(r.body).toContain('9944213233');
    expect(r.body).not.toContain('<form');
  });

  it('/faq JSON-LD lists only the policy questions, and the body repeats them', async () => {
    const r = await render('/faq', '', 'coco36.com');
    expect(ldTypes(r.body)).toContain('FAQPage');
    const faq = [...r.body.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .map((m) => JSON.parse(m[1]))
      .find((b) => b['@type'] === 'FAQPage');
    const questions = faq.mainEntity.map((q: { name: string }) => q.name);
    expect(questions).toHaveLength(4);
    for (const q of questions) expect(r.body).toContain(q);
  });

  it('/shipping and /returns keep owner TODOs in the HTML', async () => {
    for (const p of ['/shipping', '/returns', '/about', '/contact']) {
      const r = await render(p, '', 'coco36.com');
      expect(r.body, p).toContain('TODO for the owner');
    }
    const faq = await render('/faq', '', 'coco36.com');
    expect(faq.body).not.toContain('TODO for the owner');
  });

  it('/cart is a real noindex page, not a 404', async () => {
    const r = await render('/cart', '', 'coco36.com');
    expect(r.status).toBe(200);
    expect(robots(r.body)).toMatch(/noindex/);
    expect(canonical(r.body)).toBe('https://coco36.com/cart');
    expect(r.body).toContain('Your cart is empty');
    expect(r.body).toContain('href="/shop"');
  });

  it('privacy title is in the 50–59 character band', async () => {
    const r = await render('/privacy', '', 'coco36.com');
    expect(title(r.body)).toBe('How COCO36 Foods Protects Your Personal Data | COCO36');
    expect(title(r.body).length).toBeGreaterThanOrEqual(50);
    expect(title(r.body).length).toBeLessThanOrEqual(59);
  });
});

describe('traceability on the server', () => {
  const mockDb = (extra: Record<string, unknown>) =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const hit = Object.keys(extra).find((k) => url.includes(k));
      const body = hit ? extra[hit]
        : url.includes('/rest/v1/products') ? [{ ...product, product_tags: [
            { tag: { slug: 'usda-organic', label: 'USDA Organic', kind: 'certification' } },
            { tag: { slug: 'vegan', label: 'Vegan', kind: 'dietary' } },
          ] }]
        : url.includes('/rest/v1/categories') ? [category]
        : [];
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    });

  it('a certification badge is served only with a valid certificate (product_claims)', async () => {
    const { loadCatalog } = await import('../../server/catalog');
    mockDb({ 'rpc/product_claims': [] });
    expect((await loadCatalog()).products[0].tags!.map((t) => t.slug)).toEqual(['vegan']);
    resetCatalogCache();
    mockDb({ 'rpc/product_claims': [{ product_id: PRODUCT_ID, claim: 'usda-organic' }] });
    expect((await loadCatalog()).products[0].tags!.map((t) => t.slug)).toEqual(['usda-organic', 'vegan']);
    resetCatalogCache();
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      if (String(input).includes('rpc/product_claims')) return new Response('{"message":"boom"}', { status: 500 });
      const url = String(input);
      const body = url.includes('/rest/v1/products') ? [{ ...product, product_tags: [{ tag: { slug: 'brcgs', label: 'BRCGS', kind: 'certification' } }] }] : url.includes('/rest/v1/categories') ? [category] : [];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    expect((await loadCatalog()).products[0].tags).toEqual([]);
  });

  it('/lot/<lot> is 404 while SHOW_LOT_PASSPORT is off (the database returns nothing)', async () => {
    mockDb({ 'rpc/lot_passport': null });
    const r = await render('/lot/C36-VANL-20261203-01', '', 'coco36.com');
    expect(r.status).toBe(404);
    expect(robots(r.body)).toBe('noindex');
  });

  it('/lot/<lot> with the flag on: 200 and never indexed', async () => {
    const f = mockDb({ 'rpc/lot_passport': { lot_code: 'C36-VANL-20261203-01', product: { id: PRODUCT_ID, name: 'Vanilla', size: '100 g' }, origin: { country: 'India', region: 'Kerala' }, supplier: null, expiry_date: null, best_before: null, recalled: false, coa_url: null, certificates: [] } });
    const r = await render('/lot/c36-vanl-20261203-01', '', 'coco36.com');
    expect(r.status).toBe(200);
    expect(robots(r.body)).toBe('noindex, follow');
    expect(title(r.body)).toBe('Lot C36-VANL-20261203-01 · Vanilla | COCO36');
    expect(f.mock.calls.map(([u]) => String(u)).find((u) => u.includes('lot_passport'))).toContain('p_lot=C36-VANL-20261203-01');
  });
});
