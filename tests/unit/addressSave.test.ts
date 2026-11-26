import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * F112: addAddress must ensure the customers row (signup upsert, not a client
 * insert — RLS has no customers insert) and retry once on 23503. A failed
 * save shows a visible error instead of returning null with no UI.
 */

type InsertResult = { data: Record<string, unknown> | null; error: { message: string; code?: string } | null };

let customerRow: { name: string | null; phone: string | null } | null = null;
let customerError: { message: string } | null = null;
let insertResults: InsertResult[] = [];
const inserted: unknown[] = [];
const customerOps: string[] = [];

vi.mock('../../src/lib/supabase', () => ({
  API_URL: 'https://admin.example.test',
  supabase: {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            access_token: 'a.b.c',
            user: { id: 'user-1', user_metadata: { full_name: 'Asha Rao', name: 'Asha' } },
          },
        },
      }),
    },
    from: (table: string) => {
      if (table === 'customers') {
        customerOps.push('select');
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: customerRow, error: customerError }),
            }),
          }),
          insert: () => { customerOps.push('insert'); throw new Error('RLS: customers insert is not allowed'); },
          upsert: () => { customerOps.push('upsert'); throw new Error('RLS: customers upsert is not allowed'); },
        };
      }
      if (table !== 'addresses') throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          is: () => ({
            order: () => ({
              order: async () => ({ data: [], error: null }),
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            is: async () => ({ error: null }),
          }),
        }),
        insert: (row: unknown) => {
          inserted.push(row);
          return {
            select: () => ({
              single: async () => insertResults.shift() ?? { data: null, error: { message: 'missing', code: '23503' } },
            }),
          };
        },
      };
    },
  },
}));

const { addAddress, ADDRESS_SAVE_FAILED_MESSAGE } = await import('../../src/lib/addresses');
const { AddressSaveAlert } = await import('../../src/components/AddressSaveAlert');

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

const input = {
  name: 'Asha',
  line1: '1 Beach Road',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
};

const saved = {
  id: 'addr-1',
  label: null,
  name: 'Asha',
  line1: '1 Beach Road',
  line2: null,
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  gstin: null,
  is_default: true,
  created_at: '2026-11-26T00:00:00.000Z',
};

const fk = {
  data: null,
  error: {
    code: '23503',
    message: 'insert or update on table "addresses" violates foreign key constraint "addresses_customer_id_fkey"',
  },
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  customerRow = null;
  customerError = null;
  insertResults = [];
  inserted.length = 0;
  customerOps.length = 0;
});

describe('23503 retry', () => {
  it('ensures the customers row via signup and retries the address insert once on 23503', async () => {
    insertResults = [fk, { data: saved, error: null }];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    const row = await addAddress('user-1', input);

    expect(row).toEqual(saved);
    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({ customer_id: 'user-1', line1: '1 Beach Road' });
    expect(inserted[1]).toMatchObject({ customer_id: 'user-1', line1: '1 Beach Road' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://admin.example.test/api/customers/signup');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer a.b.c');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Asha Rao' });
    expect(customerOps).not.toContain('insert');
    expect(customerOps).not.toContain('upsert');
  });

  it('does not insert a third time when the retry is also 23503', async () => {
    insertResults = [fk, fk];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    expect(await addAddress('user-1', input)).toBeNull();
    expect(inserted).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-23503 failure, and prefers the saved customers row on the upsert', async () => {
    customerRow = { name: 'Saved Name', phone: '9876543210' };
    insertResults = [{ data: null, error: { code: '42501', message: 'permission denied' } }];
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    expect(await addAddress('user-1', input)).toBeNull();
    expect(inserted).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      name: 'Saved Name',
      phone: '9876543210',
    });
    expect(customerOps).not.toContain('insert');
    expect(customerOps).not.toContain('upsert');
  });
});

describe('visible address save error', () => {
  it("renders We couldn't save this address. Please try again. as an alert", () => {
    expect(ADDRESS_SAVE_FAILED_MESSAGE).toBe("We couldn't save this address. Please try again.");
    const html = renderToStaticMarkup(createElement(AddressSaveAlert, { message: ADDRESS_SAVE_FAILED_MESSAGE }));
    expect(html).toContain('role="alert"');
    // renderToStaticMarkup escapes the apostrophe; the shopper still reads the copy.
    expect(html).toContain('couldn&#x27;t save this address. Please try again.');
    expect(renderToStaticMarkup(createElement(AddressSaveAlert, { message: null }))).toBe('');
  });

  it('account and checkout show that alert and keep the form open when addAddress returns null', () => {
    const account = read('src/pages/Account.tsx');
    const checkout = read('src/pages/Checkout.tsx');
    for (const src of [account, checkout]) {
      expect(src).toContain('ADDRESS_SAVE_FAILED_MESSAGE');
      expect(src).toContain('<AddressSaveAlert message={addressError} />');
      expect(src).toContain('if (!created)');
    }
    const addShip = checkout.slice(checkout.indexOf('const addShipAddress'), checkout.indexOf('const addBillAddress'));
    expect(addShip.indexOf('if (!created) return;')).toBeGreaterThan(-1);
    expect(addShip.indexOf('if (!created) return;')).toBeLessThan(addShip.indexOf('setAddingShip(false)'));
    expect(account).not.toContain('await addAddress(user.id, input);\n    await refreshAddresses();');
  });
});
