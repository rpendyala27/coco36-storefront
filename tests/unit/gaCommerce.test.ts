import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addToCartParams,
  beginCheckoutParams,
  paiseToRupees,
  purchaseParams,
  purchaseStorageKey,
  viewItemParams,
  type GaLine,
} from '../../src/lib/gaCommerce';
import {
  resetAnalyticsForTests,
  setAnalyticsConsent,
  trackAddToCart,
  trackBeginCheckout,
  trackPurchase,
  trackViewItem,
} from '../../src/lib/analytics';

const vanilla: GaLine = {
  sku: 'VAN-BOUR-5BN',
  name: 'Madagascar Bourbon Vanilla Beans',
  variant: '5 beans',
  unitPricePaise: 89900,
  quantity: 1,
};
const sugar: GaLine = {
  sku: 'SGR-MUSD-1KG',
  name: 'Muscovado',
  variant: '1 kg',
  unitPricePaise: 45000,
  quantity: 2,
};

function installBrowser() {
  const store = new Map<string, string>();
  const dataLayer: unknown[] = [];
  // Node has no document. The analytics module only touches these fields.
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = g;
  g.dataLayer = dataLayer;
  g.sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
  };
  g.document = {
    title: 'COCO36',
    head: { appendChild: () => {} },
    querySelector: () => null,
    createElement: () => ({ src: '', async: false }),
  };
  g.location = { href: 'https://coco36.com/shop', pathname: '/shop', search: '' };
  return { store, dataLayer };
}

function commerceEvents(dataLayer: unknown[]): { name: string; params: Record<string, unknown> }[] {
  return dataLayer
    .map((entry) => entry as { 0: string; 1?: string; 2?: Record<string, unknown> })
    .filter((entry) => entry[0] === 'event' && entry[1] !== 'page_view')
    .map((entry) => ({ name: String(entry[1]), params: entry[2] ?? {} }));
}

describe('GA4 ecommerce payloads', () => {
  it('converts paise to rupees', () => {
    expect(paiseToRupees(89900)).toBe(899);
    expect(paiseToRupees(50)).toBe(0.5);
  });

  it('shapes view_item, add_to_cart, begin_checkout, and purchase', () => {
    expect(viewItemParams(vanilla)).toEqual({
      currency: 'INR',
      value: 899,
      items: [{
        item_id: 'VAN-BOUR-5BN',
        item_name: 'Madagascar Bourbon Vanilla Beans',
        item_variant: '5 beans',
        price: 899,
        quantity: 1,
      }],
    });
    expect(addToCartParams(sugar)).toEqual({
      currency: 'INR',
      value: 900,
      items: [{
        item_id: 'SGR-MUSD-1KG',
        item_name: 'Muscovado',
        item_variant: '1 kg',
        price: 450,
        quantity: 2,
      }],
    });
    expect(beginCheckoutParams([vanilla, sugar], 179900)).toEqual({
      currency: 'INR',
      value: 1799,
      items: [
        { item_id: 'VAN-BOUR-5BN', item_name: 'Madagascar Bourbon Vanilla Beans', item_variant: '5 beans', price: 899, quantity: 1 },
        { item_id: 'SGR-MUSD-1KG', item_name: 'Muscovado', item_variant: '1 kg', price: 450, quantity: 2 },
      ],
    });
    expect(purchaseParams({ orderNumber: 'C36-1001', totalPaise: 184900, lines: [vanilla, sugar] })).toEqual({
      transaction_id: 'C36-1001',
      currency: 'INR',
      value: 1849,
      items: [
        { item_id: 'VAN-BOUR-5BN', item_name: 'Madagascar Bourbon Vanilla Beans', item_variant: '5 beans', price: 899, quantity: 1 },
        { item_id: 'SGR-MUSD-1KG', item_name: 'Muscovado', item_variant: '1 kg', price: 450, quantity: 2 },
      ],
    });
  });

  it('drops a line with no SKU and refuses an empty purchase id', () => {
    expect(viewItemParams({ ...vanilla, sku: '  ' })).toBeNull();
    expect(addToCartParams({ ...sugar, quantity: 0 })).toBeNull();
    expect(beginCheckoutParams([{ ...vanilla, sku: '' }], 89900)).toBeNull();
    expect(purchaseParams({ orderNumber: '  ', totalPaise: 100, lines: [vanilla] })).toBeNull();
    const purchase = purchaseParams({ orderNumber: 'C36-1', totalPaise: 100, lines: [{ ...vanilla, sku: '' }] });
    expect(purchase?.items).toEqual([]);
    expect(JSON.stringify(purchase)).not.toMatch(/email|phone|address|pincode/i);
  });
});

describe('GA4 ecommerce consent gate', () => {
  let dataLayer: unknown[] = [];
  let store = new Map<string, string>();

  beforeEach(() => {
    vi.stubEnv('VITE_GA_DEV', 'true');
    resetAnalyticsForTests();
    ({ dataLayer, store } = installBrowser());
  });

  afterEach(() => {
    resetAnalyticsForTests();
    vi.unstubAllEnvs();
  });

  it('sends nothing before Accept', () => {
    trackViewItem(vanilla);
    trackAddToCart(sugar);
    trackBeginCheckout([vanilla, sugar], 179900);
    trackPurchase({ orderNumber: 'C36-1001', totalPaise: 184900, lines: [vanilla, sugar] });
    setAnalyticsConsent('rejected');
    trackViewItem(vanilla);
    expect(commerceEvents(dataLayer)).toEqual([]);
    expect(store.has(purchaseStorageKey('C36-1001'))).toBe(false);
  });

  it('sends each event after Accept, and purchase only once per order number', () => {
    setAnalyticsConsent('accepted');
    trackViewItem(vanilla);
    trackAddToCart(sugar);
    trackBeginCheckout([vanilla], 89900);
    trackPurchase({ orderNumber: 'C36-1001', totalPaise: 184900, lines: [vanilla, sugar] });
    trackPurchase({ orderNumber: 'C36-1001', totalPaise: 184900, lines: [vanilla, sugar] });

    const events = commerceEvents(dataLayer);
    expect(events.map((e) => e.name)).toEqual(['view_item', 'add_to_cart', 'begin_checkout', 'purchase']);
    expect(events[0].params).toEqual(viewItemParams(vanilla));
    expect(events[1].params).toEqual(addToCartParams(sugar));
    expect(events[2].params).toEqual(beginCheckoutParams([vanilla], 89900));
    expect(events[3].params).toMatchObject({
      transaction_id: 'C36-1001',
      currency: 'INR',
      value: 1849,
    });
    expect(JSON.stringify(events)).not.toMatch(/email|phone|address|pincode/i);
    expect(store.get(purchaseStorageKey('C36-1001'))).toBe('1');

    resetAnalyticsForTests();
    setAnalyticsConsent('accepted');
    const before = commerceEvents(dataLayer).length;
    trackPurchase({ orderNumber: 'C36-1001', totalPaise: 184900, lines: [vanilla] });
    expect(commerceEvents(dataLayer)).toHaveLength(before);
  });
});
