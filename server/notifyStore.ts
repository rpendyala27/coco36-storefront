import { productPath } from '../src/lib/productPath.js';
import type { NotifyEnv } from './notify.js';
import type { StockHit, UnsentSignup } from './restock.js';
import type { SignupTally } from './notifyCsv.js';

/** Service-role reads and the sent-flag update. Never imported by client code. */

export interface ServiceEnv extends NotifyEnv {
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export function serviceCredentials(env: ServiceEnv): { url: string; key: string } | null {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
  if (!url || !key) return null;
  return { url, key };
}

async function rest(env: ServiceEnv, path: string, init: RequestInit, fetchImpl: typeof fetch): Promise<unknown> {
  const creds = serviceCredentials(env);
  if (!creds) throw new Error('unconfigured');
  const headers = new Headers(init.headers);
  headers.set('apikey', creds.key);
  headers.set('Authorization', `Bearer ${creds.key}`);
  headers.set('Accept', 'application/json');
  const res = await fetchImpl(`${creds.url}/rest/v1/${path}`, { ...init, headers });
  if (!res.ok) throw new Error(`postgrest ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function listUnsent(env: ServiceEnv, fetchImpl: typeof fetch): Promise<UnsentSignup[]> {
  const rows = await rest(
    env,
    'back_in_stock_signups?select=id,product_key,product_name,email&sent_at=is.null',
    { method: 'GET' },
    fetchImpl,
  );
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is UnsentSignup =>
    !!row && typeof row === 'object'
    && typeof (row as UnsentSignup).id === 'string'
    && typeof (row as UnsentSignup).email === 'string');
}

export async function listStock(env: ServiceEnv, fetchImpl: typeof fetch): Promise<StockHit[]> {
  const rows = await rest(
    env,
    'products?select=id,name,variants:product_variants(in_stock)&status=eq.active&deleted_at=is.null',
    { method: 'GET' },
    fetchImpl,
  );
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const rec = row as { id?: string; name?: string; variants?: { in_stock?: boolean }[] };
    if (!rec.id || !rec.name) return [];
    return [{
      id: rec.id,
      name: rec.name,
      inStock: (rec.variants ?? []).some((v) => v.in_stock),
      path: productPath({ id: rec.id, name: rec.name }),
    }];
  });
}

export async function listTallies(env: ServiceEnv, fetchImpl: typeof fetch): Promise<SignupTally[]> {
  const rows = await rest(
    env,
    'back_in_stock_signups?select=product_name,audience,pack_size',
    { method: 'GET' },
    fetchImpl,
  );
  if (!Array.isArray(rows)) return [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const rec = row as SignupTally;
    if (typeof rec.product_name !== 'string') return [];
    return [{ product_name: rec.product_name, audience: rec.audience ?? null, pack_size: rec.pack_size ?? null }];
  });
}

export async function claimSignup(env: ServiceEnv, id: string, fetchImpl: typeof fetch): Promise<boolean> {
  const rows = await rest(
    env,
    `back_in_stock_signups?id=eq.${encodeURIComponent(id)}&sent_at=is.null`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ sent_at: new Date().toISOString() }),
    },
    fetchImpl,
  );
  return Array.isArray(rows) && rows.length === 1;
}

export async function releaseSignup(env: ServiceEnv, id: string, fetchImpl: typeof fetch): Promise<void> {
  await rest(
    env,
    `back_in_stock_signups?id=eq.${encodeURIComponent(id)}&sent_message_id=is.null`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ sent_at: null }),
    },
    fetchImpl,
  );
}

export async function markSignupSent(env: ServiceEnv, id: string, messageId: string, fetchImpl: typeof fetch): Promise<void> {
  await rest(
    env,
    `back_in_stock_signups?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ sent_message_id: messageId }),
    },
    fetchImpl,
  );
}

export async function lookupAuthEmail(env: NotifyEnv, jwt: string, fetchImpl: typeof fetch): Promise<string | null> {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !key || !jwt) return null;
  try {
    const res = await fetchImpl(`${url}/auth/v1/user`, {
      headers: { apikey: key, Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    const body = await res.json() as { email?: string };
    return typeof body.email === 'string' ? body.email : null;
  } catch {
    return null;
  }
}
