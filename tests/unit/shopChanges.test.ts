import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, setTemplate } from '../../server/render';
import { resetCatalogCache } from '../../server/catalog';
import { COMING_SOON, COMING_SOON_NOTE } from '../../src/content/comingSoon';
import { SHOP_LEDE, SHOP_PROMISES } from '../../src/content/shopIntro';
import { NOTIFY_BUTTON } from '../../src/content/notifyCopy';
import { NotifyForm, type NotifyFields } from '../../src/components/NotifyMe';
import { TradeBulkLink } from '../../src/components/TradeBulkLink';
import { quickOrderDockClass } from '../../src/lib/quickOrderDock';
import { createElement } from 'react';

beforeAll(() => {
  setTemplate(readFileSync(path.resolve(__dirname, '../../index.html'), 'utf8'));
});

beforeEach(() => {
  resetCatalogCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json' } }));
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

const fields: NotifyFields = { email: '', phone: '', audience: '', packSize: '', company: '' };

describe('shop intro snapshot', () => {
  it('puts one lede and the promise row above the grid, SEO and coming soon below, and keeps the title', async () => {
    const r = await render('/shop', '', 'coco36.com');
    expect(r.body).toContain('<title>Shop Baking &amp; Pastry Ingredients in India | COCO36</title>');
    expect(r.body).toContain('rel="canonical" href="https://coco36.com/shop"');
    const ledeAt = r.body.indexOf(SHOP_LEDE);
    const gridAt = r.body.indexOf('<h2>Coming soon</h2>');
    const seoAt = r.body.indexOf('full catalogue of specialty baking');
    expect(ledeAt).toBeGreaterThan(0);
    expect(gridAt).toBeGreaterThan(ledeAt);
    expect(seoAt).toBeGreaterThan(gridAt);
    for (const item of SHOP_PROMISES) expect(r.body).toContain(item.label);
    expect(r.body.toLowerCase()).not.toContain('homepage is a shorter introduction');
    for (const item of COMING_SOON) {
      expect(r.body).toContain(item.name);
      expect(r.body).not.toContain(`href="/shop/${item.key}"`);
    }
    expect(r.body).toContain(COMING_SOON_NOTE);
    expect(r.body).not.toMatch(/natural cocoa/i);
    expect(COMING_SOON.map((item) => item.name).join(' ')).not.toMatch(/natural cocoa/i);
  });
});

describe('header and quick order', () => {
  it('renders Trade & bulk as an outlined link to /trade', () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(TradeBulkLink)));
    expect(html).toContain('href="/trade"');
    expect(html).toContain('Trade &amp; bulk');
    expect(html).toContain('btn-ghost');
    expect(html).not.toContain('>Trade<');
  });

  it('hides the floating quick-order button on phones, over the cart, and over the footer', () => {
    const base = { cartOpen: false, footerVisible: false, cookieOpen: false, stickyBuy: false };
    expect(quickOrderDockClass(base)).toContain('hidden md:inline-flex');
    expect(quickOrderDockClass(base)).toContain('bottom-6');
    expect(quickOrderDockClass(base)).toContain('right-6');
    expect(quickOrderDockClass({ ...base, cartOpen: true })).toContain('hidden');
    expect(quickOrderDockClass({ ...base, cartOpen: true })).not.toContain('md:inline-flex');
    expect(quickOrderDockClass({ ...base, footerVisible: true })).not.toContain('md:inline-flex');
    expect(quickOrderDockClass({ ...base, cookieOpen: true })).toContain('bottom-64');
    expect(quickOrderDockClass({ ...base, stickyBuy: true })).toContain('bottom-28');
  });
});

describe('notify form states', () => {
  const form = (status: 'form' | 'submitting' | 'done' | 'error', extra: Partial<Parameters<typeof NotifyForm>[0]> = {}) =>
    renderToStaticMarkup(createElement(NotifyForm, {
      productName: 'Dutch-process cocoa powder',
      comingSoon: true,
      status,
      fields,
      fieldErrors: {},
      onChange: () => {},
      onSubmit: () => {},
      onClose: () => {},
      ...extra,
    }));

  it('shows the fields, the reassurance line, and coming soon', () => {
    const html = form('form');
    expect(html).toContain('Email');
    expect(html).toContain('Phone');
    expect(html).toContain('optional');
    expect(html).toContain('Home baker or business');
    expect(html).toContain('Small (100–250 g)');
    expect(html).toContain('500 g–1 kg');
    expect(html).toContain('Bulk (5 kg+)');
    expect(html).toContain('No marketing.');
    expect(html).toContain('message you once');
    expect(html).toContain(COMING_SOON_NOTE);
    expect(html).toContain(NOTIFY_BUTTON);
    expect(html).not.toMatch(/₹|FSSAI/i);
  });

  it('shows validation, a save error, and the confirmation', () => {
    expect(form('form', { fieldErrors: { email: 'Enter a valid email address.' } })).toContain('Enter a valid email address.');
    expect(form('error', { message: "We couldn't save that just now. Please try again later." })).toContain('save that just now');
    const done = form('done');
    expect(done).toContain('You&#x27;re on the list');
    expect(done).toContain('No marketing.');
    expect(done).not.toContain('<form');
  });
});
