import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, setTemplate } from '../../server/render';
import { loadCatalog, resetCatalogCache } from '../../server/catalog';
import { sitemapEntries } from '../../server/sitemap';
import { REGISTERED_OFFICE_LINE } from '../../src/seo/site';

/**
 * Every sitemap URL, plus /terms, rendered the way the server ships it.
 * Visakhapatnam / Vizag may appear once, on /terms, in the registered-office line.
 */

const PRODUCT_ID = '6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01';
const CATEGORY_ID = '0b6a3c43-5c47-4b1e-9c38-2a7f2d1a9b01';
const MENTION = /visakhapatnam|vizag/gi;

beforeAll(() => {
  setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
});

beforeEach(() => {
  resetCatalogCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const body = url.includes('/rest/v1/products')
      ? [{
        id: PRODUCT_ID, name: 'Madagascar Bourbon Vanilla Beans', brand: 'COCO36',
        origin_country: 'Madagascar', origin_region: 'SAVA', tag_line: 'Grade A beans',
        description_md: 'Plump beans.', updated_at: '2026-10-01T00:00:00Z',
        variants: [{ id: 'v1', size_label: '5 beans', selling_price_paise: 89900, mrp_paise: 99900, in_stock: true, sort_order: 0 }],
        images: [], category: { id: CATEGORY_ID, name: 'Vanilla', slug: 'vanilla', parent_id: null }, product_tags: [],
      }]
      : url.includes('/rest/v1/categories')
        ? [{ id: CATEGORY_ID, slug: 'vanilla', name: 'Vanilla', parent_id: null, sort_order: 0, image_url: null, description: null }]
        : url.includes('/rest/v1/settings')
          ? [{ key: 'shipping.free_threshold_paise', value: 120000 }]
          : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('location mentions', () => {
  it('crawls sitemap pages and /terms and keeps a single registered-office line', async () => {
    const catalog = await loadCatalog();
    const paths = [...new Set([...sitemapEntries(catalog).map((e) => e.path), '/terms'])];
    expect(paths).toContain('/terms');
    expect(paths).toContain('/shop');
    expect(paths).toContain('/');
    expect(paths.length).toBeGreaterThan(20);

    const counts: { path: string; n: number }[] = [];
    for (const page of paths) {
      const r = await render(page, '', 'coco36.com');
      expect(r.status, page).toBe(200);
      const n = r.body.match(MENTION)?.length ?? 0;
      if (n) counts.push({ path: page, n });
      if (page !== '/terms') expect(n, page).toBe(0);
    }

    expect(counts).toEqual([{ path: '/terms', n: 1 }]);
    const terms = await render('/terms', '', 'coco36.com');
    const hits = terms.body.match(MENTION) ?? [];
    expect(hits).toEqual(['Visakhapatnam']);
    expect(terms.body.split(REGISTERED_OFFICE_LINE).length - 1).toBe(1);
    expect(terms.body).not.toContain('courts at');

    const home = await render('/', '', 'coco36.com');
    expect(home.body).not.toContain('PostalAddress');
    expect(home.body).not.toContain('addressLocality');
  });
});
