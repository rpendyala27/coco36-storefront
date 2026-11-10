import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, setTemplate } from '../../server/render';
import { resetCatalogCache } from '../../server/catalog';
import {
  DISPATCH_ZONE_PATH, fallbackHandlingDays, handlingDaysFromRows, readHandlingDays,
} from '../../server/dispatchZone';
import { shipsInLabel } from '../../src/content/policyLabels';
import { businessDayPhrase, DEFAULT_POLICY, dispatchWindow } from '../../src/seo/site';
import { shippingJsonLd } from '../../src/seo/jsonld';

/**
 * India handling_days comes from delivery_zones (service role).
 * DISPATCH_WINDOW "1" is only the fallback. Singular only for exactly "1".
 */

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

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 500): Response {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
}

describe('delivery zone handling_days', () => {
  it('queries the enabled India country zone, highest priority first', () => {
    expect(DISPATCH_ZONE_PATH).toContain('scope=eq.country');
    expect(DISPATCH_ZONE_PATH).toContain('country_code=eq.IN');
    expect(DISPATCH_ZONE_PATH).toContain('enabled=eq.true');
    expect(DISPATCH_ZONE_PATH).toContain('order=priority.desc');
    expect(DISPATCH_ZONE_PATH).toContain('select=handling_days,priority');
  });

  it('uses handling_days 1 as a singular shop icon and JSON-LD max', () => {
    expect(handlingDaysFromRows([{ handling_days: 1, priority: 10 }, { handling_days: 4, priority: 1 }])).toBe(1);
    expect(shipsInLabel(dispatchWindow({ handlingDays: 1 }))).toBe('Ships in 1 business day');
    expect(businessDayPhrase('1')).toBe('1 business day');
    const shipping = shippingJsonLd(120000, { ...DEFAULT_POLICY, handlingDays: 1 });
    const delivery = shipping.deliveryTime as { handlingTime?: { minValue?: number; maxValue?: number }; transitTime?: { minValue?: number; maxValue?: number } };
    expect(delivery.handlingTime).toMatchObject({ minValue: 0, maxValue: 1 });
    expect(delivery.transitTime).toMatchObject({ minValue: 3, maxValue: 10 });
  });

  it('uses handling_days 3 as plural copy and JSON-LD max 3', () => {
    expect(shipsInLabel(dispatchWindow({ handlingDays: 3 }))).toBe('Ships in 3 business days');
    expect(businessDayPhrase('3')).toBe('3 business days');
    const shipping = shippingJsonLd(120000, { ...DEFAULT_POLICY, handlingDays: 3 });
    const delivery = shipping.deliveryTime as { handlingTime?: { maxValue?: number } };
    expect(delivery.handlingTime).toMatchObject({ minValue: 0, maxValue: 3 });
  });

  it('falls back to 1 when the service role is missing, the read fails, or no row is usable', async () => {
    expect(fallbackHandlingDays()).toBe(1);
    expect(await readHandlingDays({}, fetch)).toBe(1);
    const fetchImpl = vi.fn(async (input: string) => {
      expect(input).toContain(DISPATCH_ZONE_PATH);
      return jsonResponse([], false, 401);
    });
    expect(await readHandlingDays(
      { SUPABASE_URL: 'https://db.example.test', SUPABASE_SERVICE_ROLE_KEY: 'service-role-test' },
      fetchImpl as unknown as typeof fetch,
    )).toBe(1);
    expect(await readHandlingDays(
      { SUPABASE_URL: 'https://db.example.test', SUPABASE_SERVICE_ROLE_KEY: 'service-role-test' },
      (async () => { throw new Error('down'); }) as unknown as typeof fetch,
    )).toBe(1);
    expect(handlingDaysFromRows([{ handling_days: 0, priority: 9 }])).toBeNull();
  });

  it('reads the live zone into the shop icon and shipping title', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test');
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/rest/v1/delivery_zones')) return jsonResponse([{ handling_days: 3, priority: 8 }]);
      if (url.includes('/rest/v1/products')) return jsonResponse([]);
      if (url.includes('/rest/v1/categories')) return jsonResponse([]);
      if (url.includes('/rest/v1/settings')) return jsonResponse([
        { key: 'shipping.free_threshold_paise', value: 120000 },
        { key: 'shipping.standard_fee_paise', value: 9900 },
        { key: 'shipping.cod_extra_paise', value: 5000 },
        { key: 'returns.window_days', value: 7 },
      ]);
      if (url.includes('/rest/v1/product_claims')) return jsonResponse([]);
      return jsonResponse([]);
    });
    const shop = await render('/shop', '', 'coco36.com');
    expect(shop.body).toContain('Ships in 3 business days');
    const shipping = await render('/shipping', '', 'coco36.com');
    expect(shipping.body).toContain('within 3 business days');
    expect(shipping.body).toContain('within 3 Business Days');
    expect(shipping.body).not.toContain('within 1 business day');
    const guide = await render('/guides/how-to-buy-wholesale-baking-ingredients-india', '', 'coco36.com');
    expect(guide.body).toContain('We dispatch orders within 3 business days; bulk and trade orders take 2–3 weeks.');
    expect(guide.body).not.toContain('2–4 business days');
  });
});
