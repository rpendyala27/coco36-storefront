import { authHeader } from './apiAuth';
import {
  reasonCodeFromPayload,
  settlementLines,
  type CustomerRefund,
  type CustomerRefundStatus,
} from './refundCopy';

const STATUSES = new Set<CustomerRefundStatus>(['pending', 'pending_manual', 'processed', 'failed']);

export interface SettlementOrder {
  id: string;
  cancelReason: string | null;
  totalPaise: number;
}

/** The browser Supabase client. The filter builder is thenable, not a Promise. */
type EventClient = { from(table: string): any };

function asRefund(value: unknown): CustomerRefund | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Partial<CustomerRefund>;
  if (typeof row.amountPaise !== 'number' || !STATUSES.has(row.status as CustomerRefundStatus)) return null;
  if (row.amountPaise <= 0) return null;
  return {
    amountPaise: row.amountPaise,
    status: row.status as CustomerRefundStatus,
    settledAt: typeof row.settledAt === 'string' ? row.settledAt : null,
    manual: row.manual === true,
    latePayment: row.latePayment === true,
  };
}

/** GET /api/account/refunds. An empty map when the shopper is signed out or the read fails. */
export async function fetchAccountRefunds(
  orderIds: string[],
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, CustomerRefund[]>> {
  const out = new Map<string, CustomerRefund[]>();
  if (!orderIds.length || !token) return out;
  try {
    const res = await fetchImpl(`/api/account/refunds?orderIds=${encodeURIComponent(orderIds.join(','))}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return out;
    const body = await res.json() as { orders?: unknown };
    if (!Array.isArray(body.orders)) return out;
    for (const order of body.orders) {
      if (!order || typeof order !== 'object') continue;
      const id = (order as { orderId?: unknown }).orderId;
      const refunds = (order as { refunds?: unknown }).refunds;
      if (typeof id !== 'string' || !Array.isArray(refunds)) continue;
      const parsed = refunds.flatMap((row) => {
        const refund = asRefund(row);
        return refund ? [refund] : [];
      });
      if (parsed.length) out.set(id, parsed);
    }
  } catch {
    return out;
  }
  return out;
}

async function eventRows(
  client: EventClient,
  type: string,
  orderIds: string[],
): Promise<unknown[]> {
  const { data, error } = await client
    .from('order_events')
    .select(type === 'cancel_reason' ? 'order_id,reason_code:payload->>reason_code' : 'order_id')
    .eq('type', type)
    .in('order_id', orderIds);
  if (error || !Array.isArray(data)) return [];
  return data;
}

/**
 * Plain cancel and refund lines for the caller's own cancelled orders.
 * Cancel text comes from orders.cancel_reason. The reason code comes from
 * the cancel_reason event only. A payment_after_cancel event is read as
 * order ids, without its payload. Refund rows come from /api/account/refunds.
 */
export async function loadSettlementLines(
  client: EventClient,
  orders: SettlementOrder[],
  refundsFor: (ids: string[]) => Promise<Map<string, CustomerRefund[]>>,
): Promise<Record<string, string[]>> {
  const ids = orders.map((order) => order.id).filter(Boolean);
  if (!ids.length) return {};
  const [reasons, lateEvents, refunds] = await Promise.all([
    eventRows(client, 'cancel_reason', ids).catch(() => []),
    eventRows(client, 'payment_after_cancel', ids).catch(() => []),
    refundsFor(ids).catch(() => new Map<string, CustomerRefund[]>()),
  ]);
  const codeByOrder = new Map<string, string>();
  for (const row of reasons) {
    if (!row || typeof row !== 'object') continue;
    const id = (row as { order_id?: unknown }).order_id;
    const code = reasonCodeFromPayload({ reason_code: (row as { reason_code?: unknown }).reason_code });
    if (typeof id === 'string' && code && !codeByOrder.has(id)) codeByOrder.set(id, code);
  }
  const late = new Set<string>();
  for (const row of lateEvents) {
    if (!row || typeof row !== 'object') continue;
    const id = (row as { order_id?: unknown }).order_id;
    if (typeof id === 'string') late.add(id);
  }
  const lines: Record<string, string[]> = {};
  for (const order of orders) {
    const text = settlementLines({
      cancelReason: order.cancelReason,
      reasonCode: codeByOrder.get(order.id) ?? null,
      refunds: refunds.get(order.id) ?? [],
      totalPaise: order.totalPaise,
      paymentAfterCancel: late.has(order.id),
    });
    if (text.length) lines[order.id] = text;
  }
  return lines;
}

/** Lines for the signed-in shopper. No token means cancel text only, with no refund rows. */
export async function loadOwnSettlementLines(
  client: EventClient,
  orders: SettlementOrder[],
): Promise<Record<string, string[]>> {
  const auth = await authHeader();
  const token = auth?.Authorization.startsWith('Bearer ') ? auth.Authorization.slice('Bearer '.length) : '';
  return loadSettlementLines(client, orders, (ids) => (
    token ? fetchAccountRefunds(ids, token) : Promise.resolve(new Map())
  ));
}
