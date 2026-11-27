/**
 * Customer refund read for the account pages.
 *
 * refunds has RLS and no customer policy, and anon SELECT was revoked, so the
 * browser cannot read the rows. This route checks the shopper's Supabase
 * access token, then reads with the service role only the orders that token
 * owns. The response is status, amount, a date, and two flags. Gateway ids,
 * payment ids, refund numbers, settlement references and review notes stay here.
 */

import type { CustomerRefund, CustomerRefundStatus } from '../src/lib/refundCopy.js';
import { serviceCredentials, type ServiceEnv } from './notifyStore.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_ORDER_IDS = 50;

/** Columns the service role may read. Nothing from Razorpay is in this list. */
export const REFUND_SELECT = 'order_id,amount_paise,status,updated_at,created_at,manual_settlement,reason,closed_by_review';

const STATUSES = new Set<CustomerRefundStatus>(['pending', 'pending_manual', 'processed', 'failed']);

export interface PublicRefund extends CustomerRefund {}

export interface PublicOrderRefunds {
  orderId: string;
  refunds: PublicRefund[];
}

interface RefundRow {
  order_id?: unknown;
  amount_paise?: unknown;
  status?: unknown;
  updated_at?: unknown;
  created_at?: unknown;
  manual_settlement?: unknown;
  reason?: unknown;
  closed_by_review?: unknown;
}

export function parseOrderIds(raw: string | null | undefined): string[] | null {
  if (!raw) return [];
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length > MAX_ORDER_IDS) return null;
  if (parts.some((part) => !UUID.test(part))) return null;
  return [...new Set(parts)];
}

function anonKey(env: ServiceEnv): { url: string; key: string } | null {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;
  return { url, key };
}

export async function userIdFromBearer(
  authorization: string | undefined,
  env: ServiceEnv,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const match = /^Bearer\s+(\S+)$/.exec(authorization ?? '');
  const jwt = match?.[1] ?? '';
  if (!jwt || jwt.length > 4096) return null;
  const creds = anonKey(env);
  if (!creds) return null;
  try {
    const res = await fetchImpl(`${creds.url}/auth/v1/user`, {
      headers: { apikey: creds.key, Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) return null;
    const body = await res.json() as { id?: unknown };
    return typeof body.id === 'string' && UUID.test(body.id) ? body.id : null;
  } catch {
    return null;
  }
}

function iso(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return null;
  return value;
}

/** Drop admin proof. A manual settlement contributes only its time. */
export function projectRefund(row: RefundRow): { orderId: string; createdAt: string | null; refund: PublicRefund } | null {
  if (typeof row.order_id !== 'string' || !UUID.test(row.order_id)) return null;
  const status = typeof row.status === 'string' ? row.status : '';
  if (!STATUSES.has(status as CustomerRefundStatus)) return null;
  const amount = typeof row.amount_paise === 'number' ? row.amount_paise : Number(row.amount_paise);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const settlement = row.manual_settlement;
  const manual = settlement != null && typeof settlement === 'object' && !Array.isArray(settlement);
  // A review-closed row that was never sent is replaced by another refund. A
  // processed or manually settled row is still the customer's money.
  if (row.closed_by_review != null && !manual && status !== 'processed') return null;
  const settledAt = manual
    ? iso((settlement as { at?: unknown }).at) ?? iso(row.updated_at)
    : status === 'processed' ? iso(row.updated_at) : null;
  return {
    orderId: row.order_id,
    createdAt: iso(row.created_at),
    refund: {
      amountPaise: amount,
      status: status as CustomerRefundStatus,
      settledAt,
      manual,
      latePayment: row.reason === 'payment_after_cancel',
    },
  };
}

export function projectOrders(orderIds: string[], rows: RefundRow[]): PublicOrderRefunds[] {
  const allowed = new Set(orderIds);
  const byOrder = new Map<string, { createdAt: string | null; refund: PublicRefund }[]>();
  for (const row of rows) {
    const projected = projectRefund(row);
    if (!projected || !allowed.has(projected.orderId)) continue;
    const list = byOrder.get(projected.orderId) ?? [];
    list.push(projected);
    byOrder.set(projected.orderId, list);
  }
  return orderIds.filter((id) => byOrder.has(id)).map((orderId) => ({
    orderId,
    refunds: (byOrder.get(orderId) ?? [])
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))
      .map((item) => item.refund),
  }));
}

async function rest(
  env: ServiceEnv,
  path: string,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const creds = serviceCredentials(env);
  if (!creds) throw new Error('unconfigured');
  const res = await fetchImpl(`${creds.url}/rest/v1/${path}`, {
    headers: { apikey: creds.key, Authorization: `Bearer ${creds.key}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error('postgrest');
  return res.json();
}

/**
 * Refunds for orders this user owns. Order ids the user does not own are
 * dropped before the refund table is read.
 */
export async function refundsForCustomer(
  env: ServiceEnv,
  userId: string,
  orderIds: string[],
  fetchImpl: typeof fetch,
): Promise<PublicOrderRefunds[]> {
  if (!UUID.test(userId) || orderIds.length === 0) return [];
  const listed = orderIds.map((id) => encodeURIComponent(id)).join(',');
  const orders = await rest(
    env,
    `orders?select=id&customer_id=eq.${encodeURIComponent(userId)}&id=in.(${listed})`,
    fetchImpl,
  );
  const owned = Array.isArray(orders)
    ? orders.flatMap((row) => {
      const id = row && typeof row === 'object' ? (row as { id?: unknown }).id : null;
      return typeof id === 'string' && orderIds.includes(id) ? [id] : [];
    })
    : [];
  if (owned.length === 0) return [];
  const rows = await rest(
    env,
    `refunds?select=${REFUND_SELECT}&order_id=in.(${owned.map((id) => encodeURIComponent(id)).join(',')})`,
    fetchImpl,
  );
  return projectOrders(owned, Array.isArray(rows) ? rows as RefundRow[] : []);
}

export interface RefundRequest {
  authorization?: string;
  orderIds: string | null;
  env: ServiceEnv;
  fetchImpl?: typeof fetch;
}

export async function handleAccountRefunds(
  req: RefundRequest,
): Promise<{ status: number; body: { orders: PublicOrderRefunds[] } | { error: string } }> {
  const ids = parseOrderIds(req.orderIds);
  if (ids === null) return { status: 400, body: { error: 'Check the order list and try again.' } };
  const fetchImpl = req.fetchImpl ?? fetch;
  const userId = await userIdFromBearer(req.authorization, req.env, fetchImpl);
  if (!userId) return { status: 401, body: { error: 'Please sign in.' } };
  if (ids.length === 0) return { status: 200, body: { orders: [] } };
  if (!serviceCredentials(req.env)) return { status: 503, body: { error: 'Refund status is not available yet.' } };
  try {
    const orders = await refundsForCustomer(req.env, userId, ids, fetchImpl);
    return { status: 200, body: { orders } };
  } catch {
    return { status: 503, body: { error: 'Refund status is not available yet.' } };
  }
}
