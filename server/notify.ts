import { createHash, timingSafeEqual } from 'node:crypto';
import { isComingSoonKey, comingSoonByKey } from '../src/content/comingSoon.js';
import {
  NOTIFY_EMAIL_INVALID, NOTIFY_PHONE_INVALID, NOTIFY_RATE_LIMIT, NOTIFY_UNAVAILABLE,
} from '../src/content/notifyCopy.js';
import { UUID_RE } from '../src/lib/productPath.js';

/**
 * Back-in-stock sign-ups. The browser posts here; this module validates,
 * rate-limits, drops the honeypot, and inserts with the anon key.
 * It never selects rows. Reads belong to the service role (export + restock).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+0-9][0-9\s()-]{7,19}$/;
const AUDIENCES = new Set(['home_baker', 'business']);
const PACKS = new Set(['small', '500g_1kg', 'bulk']);

const IP_LIMIT = 5;
const IP_WINDOW_MS = 10 * 60 * 1000;
const EMAIL_LIMIT = 3;
const EMAIL_WINDOW_MS = 60 * 60 * 1000;

export interface NotifyEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  NOTIFY_EXPORT_SECRET?: string;
  NOTIFY_ADMIN_EMAILS?: string;
}

export interface SignupInsert {
  product_key: string;
  product_name: string;
  email: string;
  phone: string | null;
  audience: string | null;
  pack_size: string | null;
}

export type InsertResult = 'ok' | 'duplicate' | 'unavailable';

export interface NotifyResponse {
  status: number;
  body: {
    ok: boolean;
    error?: string;
    fieldErrors?: { email?: string; phone?: string };
  };
}

export function clientIp(forwardedFor: string | undefined): string {
  const hop = forwardedFor?.split(',')[0]?.trim();
  return hop || 'unknown';
}

/** True when this key is still inside its window. Mutates `store`. */
export function allowRate(store: Map<string, number[]>, key: string, now: number, limit: number, windowMs: number): boolean {
  const recent = (store.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    store.set(key, recent);
    return false;
  }
  recent.push(now);
  store.set(key, recent);
  return true;
}

function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function parseSignup(input: Record<string, unknown>): { honeypot: boolean; row?: SignupInsert; fieldErrors?: { email?: string; phone?: string }; error?: string } {
  const company = clean(input.company, 200);
  if (company) return { honeypot: true };

  const email = clean(input.email, 254).toLowerCase();
  const phoneRaw = clean(input.phone, 20);
  const audience = clean(input.audience, 40);
  const pack = clean(input.packSize, 40);
  const productKey = clean(input.productKey, 120);
  const productName = clean(input.productName, 160).replace(/[\u0000-\u001f]/g, '');

  const fieldErrors: { email?: string; phone?: string } = {};
  if (!EMAIL_RE.test(email)) fieldErrors.email = NOTIFY_EMAIL_INVALID;
  if (phoneRaw && !PHONE_RE.test(phoneRaw)) fieldErrors.phone = NOTIFY_PHONE_INVALID;
  if (fieldErrors.email || fieldErrors.phone) return { honeypot: false, fieldErrors, error: fieldErrors.email || fieldErrors.phone };

  if (/natural cocoa/i.test(productName) || /natural cocoa/i.test(productKey)) {
    return { honeypot: false, error: NOTIFY_UNAVAILABLE };
  }
  const coming = comingSoonByKey(productKey);
  const uuid = UUID_RE.test(productKey) && productKey.length === 36;
  if (coming) {
    if (productName !== coming.name) return { honeypot: false, error: NOTIFY_UNAVAILABLE };
  } else if (!uuid || !productName) {
    return { honeypot: false, error: NOTIFY_UNAVAILABLE };
  }
  if (audience && !AUDIENCES.has(audience)) return { honeypot: false, error: NOTIFY_UNAVAILABLE };
  if (pack && !PACKS.has(pack)) return { honeypot: false, error: NOTIFY_UNAVAILABLE };
  if (!isComingSoonKey(productKey) && !uuid) return { honeypot: false, error: NOTIFY_UNAVAILABLE };

  return {
    honeypot: false,
    row: {
      product_key: productKey,
      product_name: productName,
      email,
      phone: phoneRaw || null,
      audience: audience || null,
      pack_size: pack || null,
    },
  };
}

export async function handleNotify(opts: {
  input: Record<string, unknown>;
  ip: string;
  now: number;
  store: Map<string, number[]>;
  insert: (row: SignupInsert) => Promise<InsertResult>;
}): Promise<NotifyResponse> {
  const ipKey = `ip:${opts.ip}`;
  if (!allowRate(opts.store, ipKey, opts.now, IP_LIMIT, IP_WINDOW_MS)) {
    return { status: 429, body: { ok: false, error: NOTIFY_RATE_LIMIT } };
  }
  const parsed = parseSignup(opts.input);
  if (parsed.honeypot) return { status: 200, body: { ok: true } };
  if (!parsed.row) {
    return {
      status: 400,
      body: { ok: false, error: parsed.error || NOTIFY_UNAVAILABLE, fieldErrors: parsed.fieldErrors },
    };
  }
  if (!allowRate(opts.store, `email:${parsed.row.email}`, opts.now, EMAIL_LIMIT, EMAIL_WINDOW_MS)) {
    return { status: 429, body: { ok: false, error: NOTIFY_RATE_LIMIT } };
  }
  const inserted = await opts.insert(parsed.row);
  if (inserted === 'unavailable') return { status: 503, body: { ok: false, error: NOTIFY_UNAVAILABLE } };
  return { status: 200, body: { ok: true } };
}

export function anonCredentials(env: NotifyEnv): { url: string; key: string } | null {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key) return null;
  return { url, key };
}

export async function insertWithAnon(env: NotifyEnv, row: SignupInsert, fetchImpl: typeof fetch): Promise<InsertResult> {
  const creds = anonCredentials(env);
  if (!creds) return 'unavailable';
  try {
    const res = await fetchImpl(`${creds.url}/rest/v1/back_in_stock_signups`, {
      method: 'POST',
      headers: {
        apikey: creds.key,
        Authorization: `Bearer ${creds.key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (res.ok || res.status === 409) return res.status === 409 ? 'duplicate' : 'ok';
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

function sameSecret(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function adminEmails(env: NotifyEnv): string[] {
  return (env.NOTIFY_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export type JobAuth = 'ok' | 'unauthorized' | 'unconfigured';

/** Bearer secret, or a Supabase user whose auth email is on the admin list. */
export async function authorizeJob(
  authorization: string | undefined,
  env: NotifyEnv,
  lookupEmail: (jwt: string) => Promise<string | null>,
): Promise<JobAuth> {
  const secret = env.NOTIFY_EXPORT_SECRET?.trim() || '';
  const admins = adminEmails(env);
  if (!secret && admins.length === 0) return 'unconfigured';
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() || '';
  if (!token) return 'unauthorized';
  if (secret && sameSecret(token, secret)) return 'ok';
  if (admins.length === 0) return 'unauthorized';
  const email = (await lookupEmail(token))?.trim().toLowerCase() || '';
  return email && admins.includes(email) ? 'ok' : 'unauthorized';
}
