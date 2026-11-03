import { API_URL } from './supabase';
import { authHeader } from './apiAuth';

/**
 * One key per checkout attempt. The admin API's place_order() returns the
 * order it already made for a key it has seen, so a double-click or a retry
 * after a network error never creates a second order or takes stock twice.
 * A new key is made when the cart changes or the previous attempt ended.
 */
export function newIdempotencyKey(): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `chk_${id.replace(/[^A-Za-z0-9]/g, '')}`.slice(0, 64);
}

/** A stable signature of the cart, to know when the key must change. */
export function cartSignature(items: { sizeId: string; quantity: number }[]): string {
  return items.map((i) => `${i.sizeId}:${i.quantity}`).sort().join('|');
}

/**
 * The shopper closed the Razorpay window without paying: ask the API to
 * release the stock their order holds (it checks with Razorpay first).
 * Best-effort; the server also releases unpaid orders after 30 minutes.
 */
export async function abandonCheckout(orderId: string): Promise<void> {
  const auth = await authHeader();
  if (!auth) return;
  try {
    await fetch(`${API_URL}/api/orders/abandon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ orderId }),
      keepalive: true,
    });
  } catch {
    /* the 30-minute sweep covers it */
  }
}
