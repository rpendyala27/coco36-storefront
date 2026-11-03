import { beforeEach, describe, expect, it, vi } from 'vitest';

/** src/lib/delivery.ts (Phase 2A): the storefront side of "Check delivery". */

vi.mock('../../src/lib/supabase', () => ({ API_URL: 'https://admin.example.test', supabase: {} }));

const { checkDelivery, etaText, joinWaitlist, PIN_RE } = await import('../../src/lib/delivery');

const V1 = '22222222-2222-4222-8222-222222222221';
const ok = { deliverable: true, reason: 'ok', message: null, etaMin: 3, etaMax: 7, shippingFeePaise: 9900, freeThresholdPaise: 120000, codExtraPaise: 5000, codAllowed: true, restrictedItems: [] };

beforeEach(() => vi.restoreAllMocks());

describe('checkDelivery', () => {
  it('asks the admin API with the PIN, the real (UUID) variant ids only, and COD', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(ok)));
    const r = await checkDelivery('530001', { variantIds: [V1, 'van-250'], cod: true });
    expect(r).toEqual(ok);
    const url = new URL(String(f.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe('https://admin.example.test/api/serviceability');
    expect(Object.fromEntries(url.searchParams)).toEqual({ country: 'IN', pin: '530001', variants: V1, cod: '1' });
  });

  it('a refusal from the API is an answer, not an error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ...ok, deliverable: false, reason: 'blocked', message: "We don't deliver to PIN 110001 yet." })));
    expect(await checkDelivery('110001')).toMatchObject({ deliverable: false, message: "We don't deliver to PIN 110001 yet." });
  });

  it('an API error (rate limit, outage) throws its message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Too many requests. Please wait a minute and try again.' }), { status: 429 }));
    await expect(checkDelivery('530001')).rejects.toThrow('Too many requests. Please wait a minute and try again.');
  });
});

describe('joinWaitlist', () => {
  it('posts the email, country and PIN', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}'));
    await joinWaitlist('asha@example.test', '799001');
    expect(f.mock.calls[0][0]).toBe('https://admin.example.test/api/delivery/waitlist');
    expect(JSON.parse(String((f.mock.calls[0][1] as RequestInit).body))).toEqual({ email: 'asha@example.test', country: 'IN', pin: '799001' });
  });

  it('surfaces the API’s validation message', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"Enter a valid email address"}', { status: 400 }));
    await expect(joinWaitlist('nope', '799001')).rejects.toThrow('Enter a valid email address');
  });
});

describe('etaText and PIN_RE', () => {
  it.each([
    [{ etaMin: 3, etaMax: 7 }, 'Delivers in 3–7 days'],
    [{ etaMin: 2, etaMax: 2 }, 'Delivers in 2 days'],
    [{ etaMin: 1, etaMax: null }, 'Delivers in 1 day'],
    [{ etaMin: null, etaMax: null }, null],
  ])('%j → %s', (c, text) => expect(etaText(c)).toBe(text));

  it('accepts only 6-digit PINs not starting with 0', () => {
    expect(['530001', '110001'].every((p) => PIN_RE.test(p))).toBe(true);
    expect(['053001', '53000', '5300011', 'abcdef'].some((p) => PIN_RE.test(p))).toBe(false);
  });
});
