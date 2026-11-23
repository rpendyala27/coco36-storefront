import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GA_MEASUREMENT_ID, readGaIdEnv, resolveGaMeasurementId } from '../../src/lib/gaId';
import { gaHeadForEnv } from '../../server/gaSnippet';
import { render, setTemplate } from '../../server/render';
import { resetCatalogCache } from '../../server/catalog';

const head = (html: string) => html.slice(0, html.indexOf('</head>'));

describe('GA measurement id', () => {
  it('uses the production property when the env var is unset', () => {
    expect(resolveGaMeasurementId(undefined)).toBe(DEFAULT_GA_MEASUREMENT_ID);
    expect(readGaIdEnv({})).toBe('G-H2E318VXJX');
  });

  it('treats an explicit empty value as off, including whitespace', () => {
    expect(resolveGaMeasurementId('')).toBeNull();
    expect(resolveGaMeasurementId('   ')).toBeNull();
    expect(readGaIdEnv({ VITE_GA_ID: '' })).toBeNull();
    expect(readGaIdEnv({ VITE_GA_ID: '', VITE_GA_MEASUREMENT_ID: 'G-LEGACY123' })).toBeNull();
  });

  it('rejects an id that is not a GA4 measurement id', () => {
    expect(resolveGaMeasurementId('<script>')).toBeNull();
    expect(resolveGaMeasurementId('UA-123')).toBeNull();
  });

  it('prefers VITE_GA_ID and falls back to the previous name', () => {
    expect(readGaIdEnv({ VITE_GA_ID: 'G-NEW123', VITE_GA_MEASUREMENT_ID: 'G-OLD123' })).toBe('G-NEW123');
    expect(readGaIdEnv({ VITE_GA_MEASUREMENT_ID: 'G-OLD123' })).toBe('G-OLD123');
  });
});

describe('GA head snippet', () => {
  it('is omitted outside production and when the id is empty', () => {
    expect(gaHeadForEnv({ NODE_ENV: 'test' })).toBe('');
    expect(gaHeadForEnv({ NODE_ENV: 'development', VITE_GA_ID: 'G-DEV123' })).toBe('');
    expect(gaHeadForEnv({ NODE_ENV: 'production', VITE_GA_ID: '' })).toBe('');
    expect(gaHeadForEnv({ NODE_ENV: 'production', VITE_GA_ID: '<script>' })).toBe('');
  });

  it('loads gtag.js async and does not send the automatic page_view', () => {
    const html = gaHeadForEnv({ NODE_ENV: 'production' });
    expect(html).toContain('async src="https://www.googletagmanager.com/gtag/js?id=G-H2E318VXJX"');
    expect(html).toContain('send_page_view: false');
    expect(html).toContain("analytics_storage: 'denied'");
  });
});

describe('GA tag in server-rendered head', () => {
  beforeAll(() => {
    setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
  });

  beforeEach(() => {
    resetCatalogCache();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      const body = url.includes('/rest/v1/products') ? []
        : url.includes('/rest/v1/categories') ? []
        : url.includes('/rest/v1/settings') ? [{ key: 'shipping.free_threshold_paise', value: 250000 }]
        : [];
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('stays out of the head in test and development', async () => {
    const testPage = await render('/', '', 'coco36.com');
    expect(head(testPage.body)).not.toContain('googletagmanager');
    vi.stubEnv('NODE_ENV', 'development');
    const devPage = await render('/terms', '', 'coco36.com');
    expect(head(devPage.body)).not.toContain('googletagmanager');
  });

  it('puts the async tag in the head of /, /terms, and a 404 when production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    for (const [pathname, status] of [['/', 200], ['/terms', 200], ['/no-such-page', 404]] as const) {
      const r = await render(pathname, '', 'coco36.com');
      expect(r.status, pathname).toBe(status);
      const h = head(r.body);
      expect(h, pathname).toContain('async src="https://www.googletagmanager.com/gtag/js?id=G-H2E318VXJX"');
      expect(h, pathname).toContain('send_page_view: false');
      expect(r.body.slice(r.body.indexOf('</head>')), pathname).not.toContain('googletagmanager');
    }
  });

  it('uses VITE_GA_ID and omits the tag when that var is explicitly empty', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VITE_GA_ID', 'G-CUSTOM123');
    const custom = await render('/terms', '', 'coco36.com');
    expect(head(custom.body)).toContain('id=G-CUSTOM123');
    expect(head(custom.body)).not.toContain('G-H2E318VXJX');

    vi.stubEnv('VITE_GA_ID', '');
    const off = await render('/terms', '', 'coco36.com');
    expect(off.body).not.toContain('googletagmanager');
    expect(off.body).not.toContain('G-H2E318VXJX');
  });
});
