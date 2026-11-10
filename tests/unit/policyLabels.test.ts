import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, setTemplate } from '../../server/render';
import { resetCatalogCache } from '../../server/catalog';
import { shopPromises } from '../../src/content/shopIntro';
import { freeShippingOnLabel, reportIssuesLabel, shipsInLabel } from '../../src/content/policyLabels';
import { dispatchLine, policyBlurb } from '../../src/content/orderFacts';
import { deliveryFaq } from '../../src/content/guides';
import { DISPATCH_WINDOW, DEFAULT_POLICY, dispatchDayBounds, HANDLING_DAYS_MAX } from '../../src/seo/site';
import { homeMeta } from '../../src/seo/meta';
import { shippingJsonLd } from '../../src/seo/jsonld';

/**
 * The three short labels, and every server-rendered page that repeats them,
 * follow store policy and DISPATCH_WINDOW. Changing the numbers changes the HTML.
 */

const ALT = { ...DEFAULT_POLICY, freeShippingPaise: 250000, returnWindowDays: 14 };

beforeAll(() => {
  setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
});

beforeEach(() => {
  resetCatalogCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

function mockCatalog(settings: { key: string; value: number }[]) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const body = url.includes('/rest/v1/products')
      ? [{
        id: '6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01',
        name: 'Madagascar Bourbon Vanilla Beans', brand: 'COCO36',
        origin_country: 'Madagascar', origin_region: 'SAVA', tag_line: 'Grade A',
        description_md: 'Beans.', updated_at: '2026-10-01T00:00:00Z',
        variants: [{ id: 'v1', size_label: '5 beans', selling_price_paise: 89900, mrp_paise: 99900, in_stock: true, sort_order: 0 }],
        images: [], category: { id: 'c1', name: 'Vanilla', slug: 'vanilla', parent_id: null }, product_tags: [],
      }]
      : url.includes('/rest/v1/categories')
        ? [{ id: 'c1', slug: 'vanilla', name: 'Vanilla', parent_id: null, sort_order: 0, image_url: null, description: null }]
        : url.includes('/rest/v1/settings') ? settings : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
}

describe('policy label templates', () => {
  it('builds the short labels from the shared values, including a dispatch range', () => {
    expect(DISPATCH_WINDOW).toBe('2');
    expect(HANDLING_DAYS_MAX).toBe(2);
    expect(dispatchDayBounds()).toEqual({ min: 0, max: 2 });
    expect(dispatchDayBounds('2–4')).toEqual({ min: 2, max: 4 });
    expect(shipsInLabel()).toBe('Ships in 2 business days');
    expect(shipsInLabel('2–4')).toBe('Ships in 2–4 business days');
    expect(freeShippingOnLabel(DEFAULT_POLICY)).toBe('Free shipping on ₹1,200+');
    expect(freeShippingOnLabel(ALT)).toBe('Free shipping on ₹2,500+');
    expect(reportIssuesLabel(DEFAULT_POLICY)).toBe('Report issues within 7 days');
    expect(reportIssuesLabel(ALT)).toBe('Report issues within 14 days');
    expect(shopPromises(ALT).map((item) => item.label)).toEqual([
      'Sourced direct from origin',
      'Ships in 2 business days',
      'Free shipping on ₹2,500+',
      'Report issues within 14 days',
    ]);
    expect(dispatchLine()).toContain('within 2 business days');
    expect(policyBlurb(ALT)).toContain('₹2,500');
    expect(policyBlurb(ALT)).toContain('14 days');
    expect(deliveryFaq(ALT).a).toContain('within 2 business days');
    expect(deliveryFaq(ALT).a).toContain('₹2,500');
    expect(deliveryFaq(ALT).a).toContain('14 days');
    expect(homeMeta(ALT).description).toContain('Free shipping on ₹2,500+');
    const shipping = shippingJsonLd(100, ALT);
    const delivery = shipping.deliveryTime as { handlingTime?: { minValue?: number; maxValue?: number } };
    expect(delivery.handlingTime).toMatchObject({ minValue: 0, maxValue: 2 });
  });

  it('rendered shop, home, shipping, faq, terms and product JSON-LD follow a changed setting', async () => {
    mockCatalog([
      { key: 'shipping.free_threshold_paise', value: 250000 },
      { key: 'returns.window_days', value: 14 },
    ]);
    const pages = ['/shop', '/', '/shipping', '/faq', '/returns', '/terms', '/about', '/shop/madagascar-bourbon-vanilla-beans'];
    const html = new Map<string, string>();
    for (const page of pages) {
      const r = await render(page, '', 'coco36.com');
      expect(r.status, page).toBe(200);
      html.set(page, r.body);
      expect(r.body, page).not.toContain('₹1,200');
      expect(r.body, page).not.toContain('within 7 days');
    }
    const shop = html.get('/shop')!;
    expect(shop).toContain('Ships in 2 business days');
    expect(shop).toContain('Free shipping on ₹2,500+');
    expect(shop).toContain('Report issues within 14 days');
    for (const page of ['/', '/faq', '/returns', '/terms', '/about', '/shop/madagascar-bourbon-vanilla-beans']) {
      expect(html.get(page), page).toContain('14 days');
    }
    for (const page of ['/', '/faq', '/terms', '/about', '/shop/madagascar-bourbon-vanilla-beans']) {
      expect(html.get(page), page).toContain('within 2 business days');
    }
    expect(html.get('/shipping')).toContain('Free shipping on orders of ₹2,500 or more');
    expect(html.get('/shipping')).toContain('within 2 business days');
    expect(html.get('/faq')).toContain('₹2,500');
    expect(html.get('/')).toContain('Free shipping on ₹2,500+');
    const product = html.get('/shop/madagascar-bourbon-vanilla-beans')!;
    expect(product).toContain('"merchantReturnDays":14');
    expect(product).toContain('"maxValue":2');
    const handling = product.match(/"handlingTime":\{[^}]+\}/)?.[0] ?? '';
    expect(handling).toContain('"minValue":0');
    expect(handling).toContain('"maxValue":2');
  });
});
