import { beforeEach, describe, expect, it, vi } from 'vitest';

/** src/lib/apiAuth.ts: the storefront side of the Phase 0 token contract. */

let session: { access_token: string } | null = null;
vi.mock('../../src/lib/supabase', () => ({
  API_URL: 'https://admin.example.test',
  supabase: { auth: { getSession: async () => ({ data: { session } }) } },
}));

const { authHeader, safeRedirectPath, syncCustomerProfile } = await import('../../src/lib/apiAuth');

beforeEach(() => { session = null; vi.restoreAllMocks(); });

describe('authHeader', () => {
  it('is null when signed out', async () => {
    expect(await authHeader()).toBeNull();
  });
  it('carries the access token as a Bearer header', async () => {
    session = { access_token: 'a.b.c' };
    expect(await authHeader()).toEqual({ Authorization: 'Bearer a.b.c' });
  });
});

describe('syncCustomerProfile', () => {
  it('POSTs to /api/customers/signup with the token and only name/phone', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await syncCustomerProfile('a.b.c', { name: 'Asha', phone: '' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://admin.example.test/api/customers/signup');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer a.b.c');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Asha' });
  });
  it('never throws on a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await expect(syncCustomerProfile('a.b.c')).resolves.toBeUndefined();
  });
});

describe('safeRedirectPath', () => {
  it.each([
    ['/checkout', '/checkout'],
    ['/account/orders/1?x=1', '/account/orders/1?x=1'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example', '/'],
    ['javascript:alert(1)', '/'],
    [null, '/'],
  ])('%j → %s', (input, out) => {
    expect(safeRedirectPath(input as string | null)).toBe(out);
  });
});
