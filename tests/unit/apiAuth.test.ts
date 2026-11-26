import { beforeEach, describe, expect, it, vi } from 'vitest';

/** src/lib/apiAuth.ts: the storefront side of the Phase 0 token contract. */

let session: { access_token: string } | null = null;
vi.mock('../../src/lib/supabase', () => ({
  API_URL: 'https://admin.example.test',
  supabase: { auth: { getSession: async () => ({ data: { session } }) } },
}));

const { authHeader, customerProfileHints, hintsForSignInSync, safeRedirectPath, syncCustomerProfile } = await import('../../src/lib/apiAuth');

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

describe('customerProfileHints', () => {
  it('prefers Google full_name over name', () => {
    expect(customerProfileHints({
      user_metadata: { full_name: 'Asha Rao', name: 'Asha' },
    })).toEqual({ name: 'Asha Rao' });
  });
  it('falls back to name (email sign-up metadata)', () => {
    expect(customerProfileHints({
      user_metadata: { name: 'Asha', phone: '9876543210' },
    })).toEqual({ name: 'Asha', phone: '9876543210' });
  });
  it('omits empty or missing fields', () => {
    expect(customerProfileHints({ user_metadata: { full_name: '  ', name: '' } })).toEqual({});
    expect(customerProfileHints({ user_metadata: {} })).toEqual({});
    expect(customerProfileHints(null)).toEqual({});
  });
});

describe('hintsForSignInSync', () => {
  it('sends metadata hints when there is no customer row yet', () => {
    expect(hintsForSignInSync({ name: 'Asha', phone: '9876543210' }, null)).toEqual({
      name: 'Asha', phone: '9876543210',
    });
  });
  it('prefers the saved profile so a later sign-in does not revert an edit', () => {
    expect(hintsForSignInSync(
      { name: 'Google Name', phone: '9111111111' },
      { name: 'Asha Rao', phone: '9876543210' },
    )).toEqual({ name: 'Asha Rao', phone: '9876543210' });
  });
  it('fills only the blank field from metadata', () => {
    expect(hintsForSignInSync(
      { name: 'Asha', phone: '9876543210' },
      { name: 'Asha Rao', phone: null },
    )).toEqual({ name: 'Asha Rao', phone: '9876543210' });
  });
});

