import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCatalog, rejectCodOrder, resetCatalogCache } from '../../server/catalog';
import {
  COD_DISABLED_ERROR,
  codEnabledFrom,
  codEnabledFromConfig,
  fetchCodEnabled,
  showCodPayment,
} from '../../src/lib/codGate';
import { loadStoreConfig, resetStoreConfigCache } from '../../src/lib/storeConfig';

/**
 * Global COD gate (settings key cod.enabled).
 * JSON true is the only ON. Missing or unreadable fails closed.
 * Per-PIN availability still decides once the gate is on.
 */

const KEY = 'cod.enabled';

beforeEach(() => {
  resetCatalogCache();
  resetStoreConfigCache();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example.test');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon');
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('COD payment control', () => {
  it('hides cash on delivery when cod.enabled is off, even for a PIN that would allow it', () => {
    expect(showCodPayment(false, true)).toBe(false);
    expect(showCodPayment(codEnabledFrom([{ key: KEY, value: false }]), true)).toBe(false);
    expect(showCodPayment('true', true)).toBe(false);
    expect(showCodPayment(1, true)).toBe(false);
  });

  it('hides cash on delivery when the setting is missing or the read failed', () => {
    expect(codEnabledFrom(null)).toBe(false);
    expect(codEnabledFrom(undefined)).toBe(false);
    expect(codEnabledFrom([])).toBe(false);
    expect(codEnabledFrom([{ key: 'shipping.cod_extra_paise', value: 5000 }])).toBe(false);
    expect(showCodPayment(codEnabledFrom(null), true)).toBe(false);
    expect(showCodPayment(codEnabledFrom([]), true)).toBe(false);
    expect(codEnabledFromConfig(null)).toBe(false);
    expect(codEnabledFromConfig({})).toBe(false);
    expect(codEnabledFromConfig({ codEnabled: 'true' })).toBe(false);
  });

  it('shows cash on delivery when the gate is on and the PIN allows it', () => {
    expect(codEnabledFrom([{ key: KEY, value: true }])).toBe(true);
    expect(showCodPayment(true, true)).toBe(true);
    // Per-PIN behaviour is unchanged: a PIN that refuses COD still shows the
    // control, and checkout blocks place-order with the existing message.
    expect(showCodPayment(true, false)).toBe(true);
    expect(showCodPayment(true, null)).toBe(true);
  });
});

describe('server rejects a COD order when the gate is off', () => {
  it('refuses COD when the row is false, missing, or the settings read fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    fetchMock.mockResolvedValue(json([{ key: KEY, value: false }]));
    await expect(rejectCodOrder('cod')).resolves.toEqual({
      status: 409, code: 'cod_disabled', error: COD_DISABLED_ERROR,
    });

    fetchMock.mockResolvedValue(json([]));
    await expect(rejectCodOrder('cod')).resolves.toMatchObject({ status: 409, code: 'cod_disabled' });

    fetchMock.mockResolvedValue(json([{ key: KEY, value: 'true' }]));
    await expect(rejectCodOrder('cod')).resolves.toMatchObject({ code: 'cod_disabled' });

    fetchMock.mockResolvedValue(json({ message: 'no' }, 500));
    await expect(rejectCodOrder('cod')).resolves.toMatchObject({ status: 409, code: 'cod_disabled' });

    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(rejectCodOrder('cod')).resolves.toMatchObject({ status: 409, code: 'cod_disabled' });

    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_URL', '');
    await expect(rejectCodOrder('cod')).resolves.toMatchObject({ code: 'cod_disabled' });
  });

  it('allows a COD order only when the live value is JSON true, and never blocks prepaid', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([{ key: KEY, value: false }]));
    await expect(rejectCodOrder('prepaid')).resolves.toBeNull();

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json([{ key: KEY, value: true }]));
    await expect(rejectCodOrder('cod')).resolves.toBeNull();
    await expect(rejectCodOrder('prepaid')).resolves.toBeNull();

    const asked = String(vi.mocked(fetch).mock.calls.at(-1)?.[0]);
    expect(asked).toContain('/rest/v1/settings');
    expect(decodeURIComponent(asked)).toContain(KEY);
  });

  it('reads cod.enabled with the other settings and fails closed in the catalogue policy', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/rest/v1/settings')) return json([{ key: KEY, value: false }]);
      return json([]);
    });
    expect((await loadCatalog()).policy.codEnabled).toBe(false);
    const settingsUrl = fetchMock.mock.calls.map((c) => String(c[0])).find((u) => u.includes('/rest/v1/settings')) ?? '';
    expect(decodeURIComponent(settingsUrl)).toContain('cod.enabled');

    resetCatalogCache();
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/rest/v1/settings')) return json([{ key: KEY, value: true }]);
      return json([]);
    });
    expect((await loadCatalog()).policy.codEnabled).toBe(true);

    resetCatalogCache();
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/rest/v1/settings')) return json([], 503);
      return json([]);
    });
    expect((await loadCatalog()).policy.codEnabled).toBe(false);
  });
});

describe('checkout config and the order-time read', () => {
  it('keeps COD off when the same-origin config is missing, false, or down', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ freeShippingPaise: 120000, flatShippingPaise: 9900, codSurchargePaise: 5000, returnWindowDays: 7, codEnabled: true }))
      .mockResolvedValueOnce(json({ handlingDays: 1 }));
    expect((await loadStoreConfig()).codEnabled).toBe(false);

    resetStoreConfigCache();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ freeShippingPaise: 120000, codEnabled: true }))
      .mockResolvedValueOnce(json({ handlingDays: 1, codEnabled: false }));
    expect((await loadStoreConfig()).codEnabled).toBe(false);

    resetStoreConfigCache();
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ freeShippingPaise: 120000 }))
      .mockRejectedValueOnce(new Error('config down'));
    expect((await loadStoreConfig()).codEnabled).toBe(false);
  });

  it('turns the checkout control on only when the same-origin config says JSON true', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(json({ freeShippingPaise: 120000 }))
      .mockResolvedValueOnce(json({ handlingDays: 1, codEnabled: true }));
    expect((await loadStoreConfig()).codEnabled).toBe(true);
    expect(showCodPayment(true, true)).toBe(true);
  });

  it('the order-time read fails closed unless the config body is JSON true', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ codEnabled: false }));
    expect(await fetchCodEnabled()).toBe(false);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({}, 500));
    expect(await fetchCodEnabled()).toBe(false);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await fetchCodEnabled()).toBe(false);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ codEnabled: true }));
    expect(await fetchCodEnabled()).toBe(true);
  });
});
