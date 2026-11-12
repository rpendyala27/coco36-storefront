import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  allowRate, authorizeJob, handleNotify, insertSignup, parseSignup, type SignupInsert,
} from '../../server/notify';
import { signupsToCsv } from '../../server/notifyCsv';
import { matchBackInStock, restockEmailEnabled, restockFrom, restockMail, runRestock } from '../../server/restock';
import { sendResend } from '../../server/resendMail';

const PRODUCT_ID = '6f1b6c1e-0c55-4c7e-9a43-8f3f6f1c0a01';

const ROW: SignupInsert = {
  product_key: PRODUCT_ID,
  product_name: 'Tahitian Vanilla Beans',
  email: 'baker@example.com',
  phone: null,
  audience: null,
  pack_size: null,
};

describe('notify validation', () => {
  it('requires an email, keeps phone, audience and pack optional, accepts a product id, and rejects retired keys and natural cocoa', () => {
    const missing = parseSignup({ productKey: PRODUCT_ID, productName: 'Tahitian Vanilla Beans', email: 'nope' });
    expect(missing.fieldErrors?.email).toMatch(/valid email/i);

    const ok = parseSignup({
      productKey: PRODUCT_ID,
      productName: 'Tahitian Vanilla Beans',
      email: '  Baker@Example.com ',
      phone: '',
      audience: 'business',
      packSize: 'bulk',
    });
    expect(ok.row).toMatchObject({
      product_key: PRODUCT_ID,
      email: 'baker@example.com',
      phone: null,
      audience: 'business',
      pack_size: 'bulk',
      product_name: 'Tahitian Vanilla Beans',
    });

    const retired = parseSignup({
      productKey: 'japanese-matcha',
      productName: 'Japanese matcha',
      email: 'baker@example.com',
    });
    expect(retired.row).toBeUndefined();

    const natural = parseSignup({
      productKey: PRODUCT_ID,
      productName: 'Natural cocoa powder',
      email: 'baker@example.com',
    });
    expect(natural.row).toBeUndefined();
  });

  it('treats a filled honeypot as success and does not insert', async () => {
    const insert = vi.fn(async () => 'ok' as const);
    const res = await handleNotify({
      input: { ...ROW, company: 'spam ltd', email: 'baker@example.com' },
      ip: '1.1.1.1',
      now: 1_000,
      store: new Map(),
      insert,
    });
    expect(res.status).toBe(200);
    expect(insert).not.toHaveBeenCalled();
  });

  it('confirms quietly when the sign-up table is missing, and still errors on other failures', async () => {
    const store = new Map<string, number[]>();
    const input = { productKey: ROW.product_key, productName: ROW.product_name, email: 'baker@example.com' };
    const quiet = await handleNotify({ input, ip: '2.2.2.2', now: 0, store, insert: async () => 'missing' });
    expect(quiet.status).toBe(200);
    expect(quiet.body).toEqual({ ok: true });

    const failed = await handleNotify({ input, ip: '2.2.2.3', now: 1, store, insert: async () => 'unavailable' });
    expect(failed.status).toBe(503);
    expect(failed.body.error).toMatch(/couldn't save/i);

    for (let i = 0; i < 5; i++) allowRate(store, 'ip:9.9.9.9', 0, 5, 60_000);
    const limited = await handleNotify({
      input,
      ip: '9.9.9.9',
      now: 10,
      store,
      insert: async () => 'missing',
    });
    expect(limited.status).toBe(429);
  });

  it('de-duplicates a repeated email for the same product', async () => {
    const seen = new Set<string>();
    const insert = vi.fn(async (row: SignupInsert) => {
      const key = `${row.product_key}:${row.email}`;
      if (seen.has(key)) return 'duplicate' as const;
      seen.add(key);
      return 'ok' as const;
    });
    const store = new Map<string, number[]>();
    const input = {
      productKey: ROW.product_key, productName: ROW.product_name,
      email: 'baker@example.com', phone: '9944213233', audience: 'home_baker', packSize: 'small',
    };
    const a = await handleNotify({ input, ip: '3.3.3.3', now: 0, store, insert });
    const b = await handleNotify({ input, ip: '4.4.4.4', now: 1, store, insert });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(seen.size).toBe(1);
  });

  it('maps a missing table and a conflict from PostgREST', async () => {
    const env = { VITE_SUPABASE_URL: 'https://db.example.test', VITE_SUPABASE_ANON_KEY: 'anon' };
    const missing = vi.fn(async () => new Response('relation does not exist', { status: 404 }));
    expect(await insertSignup(env, ROW, missing as unknown as typeof fetch)).toBe('missing');
    const conflict = vi.fn(async () => new Response('', { status: 409 }));
    expect(await insertSignup(env, ROW, conflict as unknown as typeof fetch)).toBe('duplicate');
    const calls = conflict.mock.calls[0] as unknown as [string, RequestInit];
    expect(calls[1].headers).toMatchObject({ Authorization: 'Bearer anon' });
    expect(String((calls[1].headers as Record<string, string>).Prefer)).toContain('ignore-duplicates');
  });

  it('posts the proposal columns with the service role when that key is set', async () => {
    const env = {
      VITE_SUPABASE_URL: 'https://db.example.test',
      VITE_SUPABASE_ANON_KEY: 'anon',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
    };
    const fetchImpl = vi.fn(async () => new Response('', { status: 201 }));
    expect(await insertSignup(env, ROW, fetchImpl as unknown as typeof fetch)).toBe('ok');
    const call = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(call[0]).toBe('https://db.example.test/rest/v1/back_in_stock_signups');
    expect(call[1].headers).toMatchObject({ Authorization: 'Bearer service-role' });
    const body = JSON.parse(String(call[1].body)) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual([
      'audience', 'email', 'pack_size', 'phone', 'product_key', 'product_name',
    ]);
    expect(body.product_key).toBe(PRODUCT_ID);
  });
});

describe('notify export', () => {
  it('counts one row per product, split by audience and pack size', () => {
    const csv = signupsToCsv([
      { product_name: 'Japanese matcha', audience: 'home_baker', pack_size: 'small' },
      { product_name: 'Japanese matcha', audience: 'business', pack_size: 'bulk' },
      { product_name: 'Japanese matcha', audience: null, pack_size: null },
      { product_name: 'Couverture', audience: 'business', pack_size: '500g_1kg' },
    ]);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('product,count,home_baker,business,audience_unspecified,pack_small,pack_500g_1kg,pack_bulk,pack_unspecified');
    expect(lines[1]).toBe('Couverture,1,0,1,0,0,1,0,0');
    expect(lines[2]).toBe('Japanese matcha,3,1,1,1,1,0,1,1');
  });

  it('accepts the server secret or an admin auth email, and stays shut when neither is set', async () => {
    expect(await authorizeJob(undefined, {}, async () => null)).toBe('unconfigured');
    expect(await authorizeJob('Bearer nope', { NOTIFY_EXPORT_SECRET: 's3cret-value' }, async () => null)).toBe('unauthorized');
    expect(await authorizeJob('Bearer s3cret-value', { NOTIFY_EXPORT_SECRET: 's3cret-value' }, async () => null)).toBe('ok');
    const lookup = vi.fn(async (jwt: string) => (jwt === 'user-jwt' ? 'owner@coco36.com' : null));
    expect(await authorizeJob('Bearer user-jwt', { NOTIFY_ADMIN_EMAILS: 'owner@coco36.com' }, lookup)).toBe('ok');
    expect(await authorizeJob('Bearer user-jwt', { NOTIFY_ADMIN_EMAILS: 'other@coco36.com' }, lookup)).toBe('unauthorized');
  });
});

describe('restock email', () => {
  it('stays off unless the flag is exactly true, and the mail has no reply-to or price', () => {
    expect(restockEmailEnabled({})).toBe(false);
    expect(restockEmailEnabled({ RESTOCK_EMAIL_ENABLED: 'false' })).toBe(false);
    expect(restockEmailEnabled({ RESTOCK_EMAIL_ENABLED: '1' })).toBe(false);
    expect(restockEmailEnabled({ RESTOCK_EMAIL_ENABLED: 'true' })).toBe(true);
    expect(restockFrom({})).toBe('COCO36 <support@coco36.com>');
    const mail = restockMail('COCO36 <support@coco36.com>', 'baker@example.com', 'Japanese matcha', 'https://coco36.com/shop/japanese-matcha');
    expect(Object.keys(mail).sort()).toEqual(['from', 'subject', 'text', 'to']);
    expect(mail.text).not.toMatch(/₹|price|FSSAI/i);
    expect(mail.text).toContain('No marketing');
    expect(mail.text).toContain('not been added to a marketing list');
  });

  it('sends one email per sign-up and does not send again once it is marked sent', async () => {
    const sentIds = new Set<string>();
    const send = vi.fn(async () => ({ id: 'msg-1' }));
    const deps = {
      enabled: true,
      from: 'COCO36 <support@coco36.com>',
      origin: 'https://coco36.com',
      listUnsent: async () => [{ id: 'row-1', product_key: 'p1', product_name: 'Japanese matcha', email: 'baker@example.com' }],
      listProducts: async () => [{ id: 'p1', name: 'Japanese matcha', inStock: true, path: '/shop/japanese-matcha' }],
      claim: async (id: string) => {
        if (sentIds.has(id)) return false;
        sentIds.add(id);
        return true;
      },
      release: async (id: string) => { sentIds.delete(id); },
      markSent: async () => {},
      send,
    };
    const first = await runRestock(deps);
    const second = await runRestock(deps);
    expect(first).toEqual({ sent: 1, reason: 'ok' });
    expect(second).toEqual({ sent: 0, reason: 'ok' });
    expect(send).toHaveBeenCalledTimes(1);
    const payload = (send.mock.calls as unknown as [{ text: string }[]])[0][0];
    expect(payload.text).not.toMatch(/₹/);
  });

  it('does not call the sender when the flag is off, even if stock is back', async () => {
    const send = vi.fn(async () => ({ id: 'nope' }));
    const listUnsent = vi.fn(async () => []);
    const result = await runRestock({
      enabled: restockEmailEnabled({}),
      from: restockFrom({}),
      origin: 'https://coco36.com',
      listUnsent,
      listProducts: async () => [],
      claim: async () => true,
      release: async () => {},
      markSent: async () => {},
      send,
    });
    expect(result.reason).toBe('disabled');
    expect(send).not.toHaveBeenCalled();
    expect(listUnsent).not.toHaveBeenCalled();
  });

  it('matches a coming-soon key only once the catalogue item is in stock', () => {
    const signup = { id: '1', product_key: 'dutch-process-cocoa-powder', product_name: 'Dutch-process cocoa powder', email: 'a@b.co' };
    const oos = [{ id: 'p', name: 'Dutch-process cocoa powder', inStock: false, path: '/shop/dutch-process-cocoa-powder' }];
    const back = [{ ...oos[0], inStock: true }];
    expect(matchBackInStock(signup, oos)).toBeNull();
    expect(matchBackInStock(signup, back)?.path).toBe('/shop/dutch-process-cocoa-powder');
  });

  it('posts to Resend without a reply_to field', async () => {
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.reply_to).toBeUndefined();
      expect(body.replyTo).toBeUndefined();
      expect(Object.keys(body).sort()).toEqual(['from', 'subject', 'text', 'to']);
      return new Response(JSON.stringify({ id: 're_1' }), { status: 200 });
    });
    const mail = restockMail('COCO36 <support@coco36.com>', 'baker@example.com', 'Matcha', 'https://coco36.com/shop');
    await sendResend('re_test_key', mail, fetchImpl as unknown as typeof fetch);
  });
});

describe('proposal migration', () => {
  it('is marked NEEDS-YES, is not under supabase/migrations, and documents the rollback', () => {
    const file = path.resolve(__dirname, '../../proposals/NEEDS-YES-back-in-stock-signups.sql');
    const sql = readFileSync(file, 'utf8');
    expect(sql).toContain('NEEDS-YES');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('grant insert');
    expect(sql).toContain('back_in_stock_signups_one_per_email');
    expect(sql).not.toMatch(/for select/i);
    expect(sql).toContain('drop table if exists public.back_in_stock_signups');
    expect(sql.startsWith('--')).toBe(true);
    const rollback = sql.slice(sql.indexOf('-- Rollback'));
    expect(rollback.trim().startsWith('-- Rollback')).toBe(true);
    for (const line of rollback.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      expect(trimmed.startsWith('--')).toBe(true);
    }
  });
});
