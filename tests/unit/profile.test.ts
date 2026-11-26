import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PHONE_INVALID_MESSAGE } from '../../src/lib/phone';
import {
  NAME_INVALID_MESSAGE,
  NAME_MAX_LENGTH,
  NAME_TOO_LONG_MESSAGE,
  PROFILE_SAVE_FAILED_MESSAGE,
  PROFILE_SIGN_IN_MESSAGE,
  customerNameError,
  normaliseCustomerName,
} from '../../src/lib/profile';

/** src/lib/profile.ts: name/phone validation and the /account save path. */

let session: { access_token: string; user: { id: string } } | null = null;
const updateUser = vi.fn(async (_payload: { data: Record<string, unknown> }) => ({ data: {}, error: null }));
const sessionStore = {
  getItem: vi.fn(() => null as string | null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: () => null,
};

vi.mock('../../src/lib/supabase', () => ({
  API_URL: 'https://admin.example.test',
  supabase: {
    auth: {
      getSession: async () => ({ data: { session } }),
      updateUser: (payload: { data: Record<string, unknown> }) => updateUser(payload),
    },
  },
}));

vi.mock('../../src/lib/userStorage', async () => {
  const actual = await vi.importActual<typeof import('../../src/lib/userStorage')>('../../src/lib/userStorage');
  return {
    ...actual,
    browserStores: () => ({ local: null, session: sessionStore }),
  };
});

const { updateOwnProfile } = await import('../../src/lib/profile');

beforeEach(() => {
  vi.restoreAllMocks();
  session = { access_token: 'a.b.c', user: { id: 'user-1' } };
  updateUser.mockClear();
  sessionStore.getItem.mockReset();
  sessionStore.setItem.mockReset();
  sessionStore.getItem.mockReturnValue(null);
});

describe('normaliseCustomerName', () => {
  it('trims and collapses whitespace', () => {
    expect(normaliseCustomerName('  Asha   Rao  ')).toBe('Asha Rao');
  });
  it('rejects a blank or too-long name', () => {
    expect(normaliseCustomerName('   ')).toBeNull();
    expect(normaliseCustomerName('')).toBeNull();
    expect(normaliseCustomerName('A'.repeat(NAME_MAX_LENGTH + 1))).toBeNull();
    expect(normaliseCustomerName('A'.repeat(NAME_MAX_LENGTH))).toBe('A'.repeat(NAME_MAX_LENGTH));
  });
});

describe('customerNameError', () => {
  it('returns a short message for a blank name', () => {
    expect(customerNameError('  ')).toBe(NAME_INVALID_MESSAGE);
  });
  it('returns a length message when the name is too long', () => {
    expect(customerNameError('A'.repeat(NAME_MAX_LENGTH + 1))).toBe(NAME_TOO_LONG_MESSAGE);
  });
  it('is null for a usable name', () => {
    expect(customerNameError('Asha')).toBeNull();
  });
});

describe('updateOwnProfile', () => {
  it('rejects an invalid name or placeholder phone without calling the API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    expect(await updateOwnProfile({ name: '  ', phone: '9876543210' })).toEqual({
      ok: false, error: NAME_INVALID_MESSAGE,
    });
    expect(await updateOwnProfile({ name: 'Asha', phone: '9999999999' })).toEqual({
      ok: false, error: PHONE_INVALID_MESSAGE,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs only name and phone to /api/customers/signup with the Bearer token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}'));
    const result = await updateOwnProfile({ name: '  Asha Rao  ', phone: '+91 98765 43210' });
    expect(result).toEqual({ ok: true, name: 'Asha Rao', phone: '9876543210' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://admin.example.test/api/customers/signup');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer a.b.c');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Asha Rao', phone: '9876543210' });
    expect(JSON.stringify(init.body)).not.toContain('email');
  });

  it('updates the checkout draft and mirrors name/phone into user_metadata', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}'));
    sessionStore.getItem.mockReturnValue(JSON.stringify({
      name: 'Old', phone: '9999999999', paymentMethod: 'cod',
    }));
    await updateOwnProfile({ name: 'Asha', phone: '9876543210' });
    expect(sessionStore.setItem).toHaveBeenCalled();
    const written = JSON.parse(sessionStore.setItem.mock.calls[0][1] as string);
    expect(written).toEqual({ name: 'Asha', phone: '9876543210', paymentMethod: 'cod' });
    expect(updateUser).toHaveBeenCalledWith({ data: { name: 'Asha', phone: '9876543210', full_name: 'Asha' } });
  });

  it('surfaces a 400 from the API and a missing session', async () => {
    session = null;
    expect(await updateOwnProfile({ name: 'Asha', phone: '9876543210' })).toEqual({
      ok: false, error: PROFILE_SIGN_IN_MESSAGE,
    });

    session = { access_token: 'a.b.c', user: { id: 'user-1' } };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Enter a valid Indian mobile number' }), { status: 400 }),
    );
    expect(await updateOwnProfile({ name: 'Asha', phone: '9876543210' })).toEqual({
      ok: false, error: 'Enter a valid Indian mobile number',
    });
  });

  it('does not throw on a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await updateOwnProfile({ name: 'Asha', phone: '9876543210' })).toEqual({
      ok: false, error: PROFILE_SAVE_FAILED_MESSAGE,
    });
  });
});

describe('account page wiring', () => {
  const src = readFileSync(path.resolve(__dirname, '../../src/pages/Account.tsx'), 'utf8');
  it('edits name and phone, keeps email read-only, and refreshes the profile', () => {
    expect(src).toContain('updateOwnProfile');
    expect(src).toContain('refreshProfile');
    expect(src).toContain('PHONE_INVALID_MESSAGE');
    expect(src).toContain('<Pencil size={14} /> Edit');
    expect(src).toContain('<Detail label="Email"');
    expect(src).not.toMatch(/<ProfileField\s+label="Email"/);
    expect(src).not.toMatch(/<ProfileField\s+\n\s*label="Email"/);
  });
});
