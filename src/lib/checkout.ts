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
 * Best-effort; the server also releases unpaid orders once the unpaid hold
 * ends (settings orders.unpaid_hold_minutes, 30 by default).
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
    /* the unpaid-hold sweep covers it */
  }
}

// ── Razorpay window vs the unpaid hold (R08) ──────────────────────────────────
/**
 * The admin cancels a prepaid order left unpaid for the unpaid hold:
 * expire_unpaid_orders() (pg_cron) with settings orders.unpaid_hold_minutes,
 * whole minutes 10–120, 30 when unset (P21). /api/orders/create returns that
 * hold for the order (P21b A): `unpaidHoldMinutes` and `holdExpiresAt`
 * (orders.placed_at + hold, ISO UTC).
 *
 * The Razorpay window must close before that, or a shopper could pay on an
 * order that has just been released. One minute of margin covers the sweep
 * running every minute and the time between placing the order and opening
 * the window.
 *
 * F76 (done in P21, coco36-next #67, live since 23 Nov): the sweep runs every
 * minute (`* * * * *`), so a release lags the hold by at most about a minute,
 * which the margin above covers.
 */
/** Fallback only, when the API response has no hold (an older admin deploy). */
export const UNPAID_HOLD_MINUTES = 30;
export const PAYMENT_WINDOW_MARGIN_SECONDS = 60;

/** The hold fields from POST /api/orders/create (absent on an older API). */
export interface UnpaidHold {
  unpaidHoldMinutes?: unknown;
  holdExpiresAt?: unknown;
}

/** The API's minutes when they are a whole number from 10 to 120; else the 30-minute fallback. */
export function holdMinutes(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 10 && value <= 120
    ? value
    : UNPAID_HOLD_MINUTES;
}

/**
 * Seconds for Razorpay's `timeout` option. Null when nothing useful is left
 * (under a minute): place the order again instead of opening the window.
 *
 * With `holdExpiresAt` from the API: seconds until that expiry, less the
 * margin. It is also capped by the hold minutes counted from when this
 * browser placed the order, so a device clock running behind the server
 * cannot stretch the window past the real expiry.
 * Without it: the hold minutes (or 30) since the order was placed, less the
 * margin, as before.
 */
export function paymentWindowSeconds(
  placedAtMs: number,
  nowMs: number = Date.now(),
  hold: UnpaidHold = {},
): number | null {
  const elapsed = Math.max(0, Math.floor((nowMs - placedAtMs) / 1000));
  let left = holdMinutes(hold.unpaidHoldMinutes) * 60 - PAYMENT_WINDOW_MARGIN_SECONDS - elapsed;
  const expiresAtMs = typeof hold.holdExpiresAt === 'string' ? Date.parse(hold.holdExpiresAt) : Number.NaN;
  if (Number.isFinite(expiresAtMs)) {
    left = Math.min(left, Math.floor((expiresAtMs - nowMs) / 1000) - PAYMENT_WINDOW_MARGIN_SECONDS);
  }
  return left >= 60 ? left : null;
}

// ── Payment outcomes (F28) ────────────────────────────────────────────────────
/** The `error` object Razorpay passes to `payment.failed`. */
export interface RazorpayFailure {
  code?: string;
  description?: string;
  source?: string;
  step?: string;
  reason?: string;
}

export type PaymentOutcome = 'cancelled' | 'declined' | 'timed_out' | 'error';

const CANCEL_REASONS = new Set(['payment_cancelled', 'payment_cancelled_by_user', 'user_cancelled']);
const TIMEOUT_REASONS = new Set(['payment_timed_out', 'payment_timeout', 'timed_out']);

/**
 * Sort a Razorpay failure by its error code and reason:
 *  - the shopper backed out (reason payment_cancelled) → cancelled
 *  - the window or bank page timed out → timed_out
 *  - BAD_REQUEST_ERROR / GATEWAY_ERROR (bank, issuer, card, UPI said no) → declined
 *  - SERVER_ERROR or nothing usable → error
 */
export function classifyPaymentFailure(err: RazorpayFailure | null | undefined): PaymentOutcome {
  const reason = (err?.reason ?? '').toLowerCase();
  const code = (err?.code ?? '').toUpperCase();
  if (CANCEL_REASONS.has(reason)) return 'cancelled';
  if (TIMEOUT_REASONS.has(reason)) return 'timed_out';
  if (code === 'BAD_REQUEST_ERROR' || code === 'GATEWAY_ERROR') return 'declined';
  return 'error';
}

/** Razorpay's description when it is a real sentence, else nothing. */
function detail(err: RazorpayFailure | null | undefined): string {
  const d = (err?.description ?? '').trim();
  return d && d.toLowerCase() !== 'undefined' ? ` (${d.replace(/[.\s]+$/u, '')})` : '';
}

export const PAYMENT_MESSAGES = {
  cancelled: 'Payment cancelled. Your bag is unchanged; place the order again when you are ready.',
  timedOut: 'The payment window timed out and the order was released. Your bag is unchanged; place the order again when you are ready.',
  declined: (err?: RazorpayFailure | null) =>
    `Your bank declined the payment${detail(err)}. Your bag is unchanged; try again or pay another way.`,
  error: (err?: RazorpayFailure | null) =>
    `The payment didn't go through${detail(err)}. Your bag is unchanged; please try again.`,
} as const;

export function paymentMessage(outcome: PaymentOutcome, err?: RazorpayFailure | null): string {
  switch (outcome) {
    case 'cancelled': return PAYMENT_MESSAGES.cancelled;
    case 'timed_out': return PAYMENT_MESSAGES.timedOut;
    case 'declined': return PAYMENT_MESSAGES.declined(err);
    default: return PAYMENT_MESSAGES.error(err);
  }
}

/**
 * The window closed without a successful payment. A failure seen earlier in
 * the same window wins over "cancelled", so a decline is never overwritten
 * (F28). A close at or after the timeout is a timeout.
 */
export function outcomeOnDismiss(
  lastFailure: RazorpayFailure | null,
  openedAtMs: number,
  timeoutSeconds: number,
  nowMs: number = Date.now(),
): PaymentOutcome {
  if (lastFailure) return classifyPaymentFailure(lastFailure);
  if (nowMs - openedAtMs >= (timeoutSeconds - 2) * 1000) return 'timed_out';
  return 'cancelled';
}
