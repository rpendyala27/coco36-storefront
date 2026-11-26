import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * F112: sign-in used to await a customers SELECT before signup. Navigation
 * killed that call, and the next load only receives INITIAL_SESSION, so the
 * customers row was never created.
 */

type CustomerRow = { name: string | null; phone: string | null } | null;
let customerRead: () => Promise<{ data: CustomerRow; error: { message: string } | null }>;
let authSession: {
  access_token: string;
  user: { id: string; user_metadata?: Record<string, unknown> | null };
} | null = null;

vi.mock('../../src/lib/supabase', () => ({
  API_URL: 'https://admin.example.test',
  supabase: {
    auth: { getSession: async () => ({ data: { session: authSession } }) },
    from: (table: string) => {
      if (table !== 'customers') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => customerRead(),
          }),
        }),
      };
    },
  },
}));

const { createAuthCustomerSync, ensureCustomer } = await import('../../src/lib/customerSync');

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

const session = {
  access_token: 'a.b.c',
  user: { id: 'user-1', user_metadata: { full_name: 'Asha Rao', name: 'Asha' } },
};

beforeEach(() => {
  vi.restoreAllMocks();
  customerRead = async () => ({ data: null, error: null });
  authSession = null;
});

function signupBody(fetchMock: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const init = fetchMock.mock.calls[0][1] as RequestInit;
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe('navigation during sign-in', () => {
  it('does not call signup if navigation aborts SIGNED_IN during the customers read, and the next INITIAL_SESSION creates the row', async () => {
    let resolveRead!: (value: { data: null; error: null }) => void;
    let sawRead!: () => void;
    const saw = new Promise<void>((resolve) => { sawRead = resolve; });
    customerRead = () => {
      sawRead();
      return new Promise((resolve) => { resolveRead = resolve; });
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));

    const signingIn = createAuthCustomerSync();
    const pending = signingIn.handle('SIGNED_IN', session);
    await saw;
    signingIn.abort();
    resolveRead({ data: null, error: null });
    await pending;
    expect(fetchMock).not.toHaveBeenCalled();

    customerRead = async () => ({ data: null, error: null });
    await createAuthCustomerSync().handle('INITIAL_SESSION', session);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://admin.example.test/api/customers/signup');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer a.b.c');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Asha Rao' });
  });
});

describe('INITIAL_SESSION-only load', () => {
  it('creates the customers row when a reload never emits SIGNED_IN and the row is missing', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    const sync = createAuthCustomerSync();
    await sync.handle('INITIAL_SESSION', session);
    await sync.handle('INITIAL_SESSION', session);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ name: 'Asha Rao' });
  });

  it('does not call signup on INITIAL_SESSION when the customers row already exists', async () => {
    customerRead = async () => ({ data: { name: 'Asha Rao', phone: '9876543210' }, error: null });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await createAuthCustomerSync().handle('INITIAL_SESSION', session);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still syncs on SIGNED_IN when the row exists, preferring the saved name and phone', async () => {
    customerRead = async () => ({ data: { name: 'Edited Name', phone: '9876543210' }, error: null });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    const sync = createAuthCustomerSync();
    await sync.handle('INITIAL_SESSION', session);
    await sync.handle('SIGNED_IN', session);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      name: 'Edited Name',
      phone: '9876543210',
    });
  });

  it('does not send metadata hints when the customers read fails', async () => {
    customerRead = async () => ({ data: null, error: { message: 'permission denied' } });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await createAuthCustomerSync().handle('SIGNED_IN', session);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('invalid phone hint', () => {
  it('leaves an invalid phone out of signup so the customers row can still be created', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await createAuthCustomerSync().handle('INITIAL_SESSION', {
      ...session,
      user: { ...session.user, user_metadata: { full_name: 'Asha Rao', phone: '12345' } },
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(signupBody(fetchMock)).toEqual({ name: 'Asha Rao' });
    expect(signupBody(fetchMock)).not.toHaveProperty('phone');
  });

  it('leaves out a placeholder mobile and still sends a real one', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await createAuthCustomerSync().handle('INITIAL_SESSION', {
      ...session,
      user: { ...session.user, user_metadata: { full_name: 'Asha Rao', phone: '9999999999' } },
    });
    expect(signupBody(fetchMock)).toEqual({ name: 'Asha Rao' });

    fetchMock.mockClear();
    await createAuthCustomerSync().handle('INITIAL_SESSION', {
      ...session,
      user: { ...session.user, user_metadata: { full_name: 'Asha Rao', phone: '+91 98765 43210' } },
    });
    expect(signupBody(fetchMock)).toEqual({ name: 'Asha Rao', phone: '+91 98765 43210' });
  });

  it('drops an invalid saved phone on ensureCustomer instead of sending a body the admin API rejects', async () => {
    authSession = {
      access_token: 'a.b.c',
      user: { id: 'user-1', user_metadata: { full_name: 'Asha Rao', phone: '9876543210' } },
    };
    customerRead = async () => ({ data: { name: 'Asha Rao', phone: '555' }, error: null });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}'));
    await ensureCustomer();
    expect(signupBody(fetchMock)).toEqual({ name: 'Asha Rao' });
  });
});

describe('AuthContext wiring', () => {
  it('runs the sync on SIGNED_IN and INITIAL_SESSION and aborts it when the page goes away', () => {
    const ctx = read('src/context/AuthContext.tsx');
    expect(ctx).toContain('createAuthCustomerSync()');
    expect(ctx).toContain("event === 'SIGNED_IN' || event === 'INITIAL_SESSION'");
    expect(ctx).toContain('customerSync.handle(event, session)');
    expect(ctx).toContain('customerSync.abort()');
  });
});
