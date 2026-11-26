import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, setTemplate } from '../../server/render';
import { resetCatalogCache } from '../../server/catalog';
import {
  CLAIMS_SCRIPT_ID, claimsHandoffScript, readClaimsHandoff, resetClaimsHandoff,
} from '../../src/lib/claimsHandoff';

/**
 * F14: EXECUTE on public.product_claims() is revoked from anon/public.
 * The browser never calls it. The server reads it with the service-role key,
 * renders badges from it, and embeds the same rows in the page; the browser
 * reuses them, so it shows exactly the badges the server showed.
 */

const PRODUCT_ID = '6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01';
const SERVICE_KEY = 'service-role-test-key';

const row = {
  id: PRODUCT_ID, name: 'Tahitian Vanilla Beans', brand: 'COCO36',
  origin_country: 'French Polynesia', origin_region: 'Tahaa', tag_line: '',
  description_md: 'Whole beans.', updated_at: '2026-11-01T00:00:00Z',
  variants: [{ id: 'v1', size_label: '2 beans', selling_price_paise: 120000, mrp_paise: 120000, in_stock: true, sort_order: 0 }],
  images: [],
  category: null,
  product_tags: [
    { tag: { slug: 'usda-organic', label: 'USDA Organic', kind: 'certification' } },
    { tag: { slug: 'vegan', label: 'Vegan', kind: 'dietary' } },
  ],
};

// Browser Supabase client: the products read works; product_claims must never be called.
const rpc = vi.fn(async () => ({ data: [{ product_id: PRODUCT_ID, claim: 'usda-organic' }], error: null }));
const query = {
  select: () => query, eq: () => query, is: () => query, order: () => query,
  maybeSingle: async () => ({ data: row, error: null }),
  then: (resolve: (v: unknown) => void) => resolve({ data: [row], error: null }),
};
vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: { rpc, from: () => query },
}));

type Doc = { getElementById(id: string): { textContent: string | null } | null };
const g = globalThis as { document?: Doc };

/** The JSON text the server put in the handoff block, or null. */
function handoffText(html: string): string | null {
  const open = `<script type="application/json" id="${CLAIMS_SCRIPT_ID}">`;
  const at = html.indexOf(open);
  if (at < 0) return null;
  const start = at + open.length;
  return html.slice(start, html.indexOf('</script>', start));
}

function useDocument(text: string | null): void {
  g.document = { getElementById: (id) => (id === CLAIMS_SCRIPT_ID && text !== null ? { textContent: text } : null) };
  resetClaimsHandoff();
}

function mockDb(claims: unknown[] | 'fail') {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes('rpc/product_claims')) {
      if (claims === 'fail') return new Response('{"message":"boom"}', { status: 500 });
      return new Response(JSON.stringify(claims), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const body = url.includes('/rest/v1/products') ? [row] : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
}

beforeAll(() => {
  setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
});

beforeEach(() => {
  rpc.mockClear();
  resetCatalogCache();
  resetClaimsHandoff();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  delete g.document;
  resetClaimsHandoff();
});

describe('server render embeds the claims it used (F14)', () => {
  it('writes the service-role claims into the page, and the badge shows server-side', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY);
    mockDb([{ product_id: PRODUCT_ID, claim: 'usda-organic' }]);
    const shop = await render('/shop', '', 'coco36.com');
    expect(shop.body).toContain('USDA Organic');
    expect(JSON.parse(handoffText(shop.body)!)).toEqual([{ product_id: PRODUCT_ID, claim: 'usda-organic' }]);
    expect(shop.body).not.toContain(SERVICE_KEY);
    const pdp = await render('/shop/tahitian-vanilla-beans', '', 'coco36.com');
    expect(JSON.parse(handoffText(pdp.body)!)).toEqual([{ product_id: PRODUCT_ID, claim: 'usda-organic' }]);
  });

  it('omits the block when claims are unknown: no service key, or the read failed', async () => {
    mockDb([{ product_id: PRODUCT_ID, claim: 'usda-organic' }]);
    const preview = await render('/shop', '', 'coco36.com');
    expect(handoffText(preview.body)).toBeNull();
    expect(preview.body).not.toContain('USDA Organic');

    resetCatalogCache();
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY);
    mockDb('fail');
    const failed = await render('/shop', '', 'coco36.com');
    expect(handoffText(failed.body)).toBeNull();
  });

  it('cannot close the script element from inside the JSON', () => {
    const html = claimsHandoffScript([{ product_id: 'p1', claim: '</script><img src=x>' }]);
    expect(html.indexOf('</script>')).toBe(html.length - '</script>'.length);
    expect(html).not.toContain('<img');
    const text = html.slice(html.indexOf('>') + 1, html.lastIndexOf('</script>'));
    expect(JSON.parse(text)).toEqual([{ product_id: 'p1', claim: '</script><img src=x>' }]);
    expect(claimsHandoffScript(null)).toBe('');
  });
});

describe('browser reuses the server claims (F14)', () => {
  it('shows the same claim badges the server rendered, without calling product_claims', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_KEY);
    mockDb([{ product_id: PRODUCT_ID, claim: 'usda-organic' }]);
    const page = await render('/shop', '', 'coco36.com');
    useDocument(handoffText(page.body));

    const { productService } = await import('../../src/services/productService');
    const list = await productService.list();
    const one = await productService.get(PRODUCT_ID);
    expect(list[0].tags!.map((t) => t.slug)).toEqual(['usda-organic', 'vegan']);
    expect(one!.tags!.map((t) => t.slug)).toEqual(['usda-organic', 'vegan']);

    const { loadCatalog } = await import('../../server/catalog');
    expect(list[0].tags).toEqual((await loadCatalog()).products[0].tags);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('hides claim badges when the page has no handoff block, and logs nothing', async () => {
    useDocument(null);
    const errors = vi.mocked(console.error);
    const { productService } = await import('../../src/services/productService');
    const list = await productService.list();
    expect(list[0].tags!.map((t) => t.slug)).toEqual(['vegan']);
    expect(rpc).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
  });

  it('treats a malformed block as no claims', () => {
    useDocument('{not json');
    expect(readClaimsHandoff()).toBeNull();
    useDocument(JSON.stringify([{ product_id: 1, claim: 'x' }, { product_id: 'p1', claim: 'usda-organic' }]));
    expect(readClaimsHandoff()).toEqual([{ product_id: 'p1', claim: 'usda-organic' }]);
  });

  it('the trust-band hook shows the marks the server embedded, and none without them', async () => {
    const { useClaimMarks } = await import('../../src/hooks/useClaimMarks');
    let marks: unknown;
    const Probe = () => { marks = useClaimMarks(true); return null; };

    useDocument(JSON.stringify([{ product_id: PRODUCT_ID, claim: 'usda-organic' }]));
    renderToStaticMarkup(createElement(Probe));
    expect(marks).toEqual([{ slug: 'usda-organic', label: 'USDA Organic' }]);

    useDocument(null);
    renderToStaticMarkup(createElement(Probe));
    expect(marks).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});
