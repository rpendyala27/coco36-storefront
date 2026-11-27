import { API_URL } from './supabase';
import { authHeader } from './apiAuth';
import { ORDER_STATUS_FLOW, type OrderStatus } from './order-status';

/**
 * One key per checkout attempt. The admin API's place_order() returns the
 * order it already made for a key it has seen, so a double-click or a retry
 * after a network error never creates a second order or takes stock twice.
 * Closing the Razorpay window keeps the key, so Pay again returns that order
 * and its Razorpay order while the attempt signature is unchanged. A new key
 * is made when the cart, address, payment method, name, or phone changes,
 * when the server refuses the order, or once payment is confirmed.
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

export type CheckoutPaymentMethod = 'prepaid' | 'cod';

/** The in-flight checkout attempt. `placedAt` is when its order was first placed. */
export interface CheckoutAttempt {
  key: string;
  /** Cart, addresses, payment method, name, and phone. Empty until the first submit. */
  signature: string;
  placedAt?: number;
  /** Method this key's order was placed with, once create has answered. */
  paymentMethod?: CheckoutPaymentMethod;
}

/** Everything that must match to reuse an idempotency key. */
export interface AttemptSignatureInput {
  items: { sizeId: string; quantity: number }[];
  shipAddressId: string;
  billAddressId: string;
  paymentMethod: string;
  name: string;
  phone: string;
}

/**
 * One string for the cart and the details place_order stores on the order.
 * Any change means a new order, not a retry of the previous one.
 */
export function attemptSignature(input: AttemptSignatureInput): string {
  return [
    cartSignature(input.items),
    input.shipAddressId,
    input.billAddressId,
    input.paymentMethod,
    input.name.trim(),
    input.phone,
  ].join('\u001f');
}

/**
 * Key to send on the next place-order call. The same key while the signature
 * matches, so Pay again hits the order already placed for it. A changed
 * cart, address, payment method, name, or phone is a new attempt.
 */
export function attemptForCart(attempt: CheckoutAttempt, signature: string): CheckoutAttempt {
  if (attempt.signature && attempt.signature !== signature) return { key: newIdempotencyKey(), signature };
  return { ...attempt, signature };
}

/** The create response's payment_method when it is one we know. */
export function serverPaymentMethod(value: unknown): CheckoutPaymentMethod | null {
  return value === 'prepaid' || value === 'cod' ? value : null;
}

/**
 * Which method the success screen follows. The server's payment_method wins.
 * If the response omits it and this key already placed an order for a
 * different method, that response is the old order: do not confirm it.
 */
export function placedOrderMethod(input: {
  serverPaymentMethod: unknown;
  requested: CheckoutPaymentMethod;
  attemptMethod?: CheckoutPaymentMethod;
}): { method: CheckoutPaymentMethod; mismatch: boolean } {
  const server = serverPaymentMethod(input.serverPaymentMethod);
  if (server) return { method: server, mismatch: false };
  if (input.attemptMethod && input.attemptMethod !== input.requested) {
    return { method: input.attemptMethod, mismatch: true };
  }
  return { method: input.requested, mismatch: false };
}

/** 409 checkout_expired: the reused order can no longer be paid. A new key is allowed. */
export function isCheckoutExpired(status: number, code: unknown): boolean {
  return status === 409 && code === 'checkout_expired';
}

/**
 * POST /api/orders/abandon.
 *
 * Checkout does not call this when the Razorpay window closes. That order
 * stays so a payment that lands late can still be confirmed, and Pay again
 * reuses it while the attempt signature matches. A new order waits until
 * the server answers 409 checkout_expired.
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
    /* best-effort; checkout does not depend on this call */
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
 * The Razorpay window closes 10 minutes before that hold, so a payment
 * started in the window still has time to be captured before the sweep.
 * That full window is never under 5 minutes: a hold that cannot spare
 * 10 minutes and still leave 5 (under 15 minutes) keeps the previous
 * 60-second margin. Once the window is open it still counts down, and
 * it is not opened at all when under a minute remains.
 *
 * F76 (done in P21, coco36-next #67, live since 23 Nov): the sweep runs every
 * minute (`* * * * *`).
 */
/** Fallback only, when the API response has no hold (an older admin deploy). */
export const UNPAID_HOLD_MINUTES = 30;
/** The window closes this long before the unpaid hold. */
export const PAYMENT_WINDOW_MARGIN_SECONDS = 600;
/** A full window shorter than this means the hold is too short for the 10-minute margin. */
export const PAYMENT_WINDOW_MIN_SECONDS = 5 * 60;
/** Previous margin, used when the hold is too short for 10 minutes plus 5. */
export const PAYMENT_WINDOW_SHORT_HOLD_MARGIN_SECONDS = 60;

/**
 * Margin subtracted from the hold. Ten minutes when that still leaves at
 * least five minutes of window; otherwise the old 60-second margin.
 */
export function paymentWindowMarginSeconds(holdSeconds: number): number {
  if (holdSeconds - PAYMENT_WINDOW_MARGIN_SECONDS < PAYMENT_WINDOW_MIN_SECONDS) {
    return PAYMENT_WINDOW_SHORT_HOLD_MARGIN_SECONDS;
  }
  return PAYMENT_WINDOW_MARGIN_SECONDS;
}

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
 * Seconds for Razorpay's `timeout` option. Null when under a minute is left:
 * do not open the window. The 5-minute rule picks the margin; it is not a
 * second floor on the countdown.
 *
 * With `holdExpiresAt` from the API: seconds until that expiry, less the
 * margin. It is also capped by the hold minutes counted from when this
 * browser placed the order, so a device clock running behind the server
 * cannot stretch the window past the real expiry.
 * Without it: the hold minutes (or 30) since the order was placed, less the
 * margin.
 */
export function paymentWindowSeconds(
  placedAtMs: number,
  nowMs: number = Date.now(),
  hold: UnpaidHold = {},
): number | null {
  const holdSeconds = holdMinutes(hold.unpaidHoldMinutes) * 60;
  const margin = paymentWindowMarginSeconds(holdSeconds);
  const elapsed = Math.max(0, Math.floor((nowMs - placedAtMs) / 1000));
  let left = holdSeconds - margin - elapsed;
  const expiresAtMs = typeof hold.holdExpiresAt === 'string' ? Date.parse(hold.holdExpiresAt) : Number.NaN;
  if (Number.isFinite(expiresAtMs)) {
    left = Math.min(left, Math.floor((expiresAtMs - nowMs) / 1000) - margin);
  }
  return left >= PAYMENT_WINDOW_SHORT_HOLD_MARGIN_SECONDS ? left : null;
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

/** Shown when the Razorpay window closes without a completed payment. */
export const PAYMENT_WINDOW_CLOSED_MESSAGE =
  "Payment not completed. If money left your account, don't pay again — we'll confirm your order automatically or refund you.";

/** Same screen, with the order number the shopper can quote. */
export function paymentNotCompletedMessage(orderNumber: string): string {
  const n = orderNumber.trim();
  if (!n) return PAYMENT_WINDOW_CLOSED_MESSAGE;
  return `Payment not completed for order ${n}. If money left your account, don't pay again — we'll confirm your order automatically or refund you.`;
}

/** Decline and gateway errors stay as they are. A closed window names the order. */
export function checkoutPaymentError(
  outcome: PaymentOutcome,
  err: RazorpayFailure | null | undefined,
  orderNumber: string,
): string {
  if (outcome === 'cancelled' || outcome === 'timed_out') return paymentNotCompletedMessage(orderNumber);
  return paymentMessage(outcome, err);
}

/**
 * The reused order's Razorpay window has under a minute left, so it is not
 * opened. The same attempt stays until the server says the checkout expired.
 */
export const PAYMENT_WINDOW_ENDED_MESSAGE =
  "This payment window has ended. If you paid, we'll confirm your order automatically. Otherwise you can try again in a few minutes.";

/** 409 checkout_expired: that order is already cancelled. The next tap is a new attempt. */
export const CHECKOUT_EXPIRED_MESSAGE =
  "Your previous checkout expired. If you paid, we'll refund it in full. Place your order again to continue.";

/** The create response was an order placed with a different payment method. */
export const ORDER_CHANGED_MESSAGE = 'Something changed in your order. Please tap Pay again.';

export const PAYMENT_MESSAGES = {
  cancelled: PAYMENT_WINDOW_CLOSED_MESSAGE,
  timedOut: PAYMENT_WINDOW_CLOSED_MESSAGE,
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

// ── Confirming a prepaid payment (orders.status) ─────────────────────────────
/**
 * Razorpay's success callback means the bank authorised the payment. The
 * order is confirmed only once our webhook moves orders.status to confirmed
 * (or further along). Until then the success screen must not say it is.
 */

/** How often to re-read the shopper's own order while the webhook lands. */
export const PAYMENT_CONFIRM_INTERVAL_MS = 3_000;
/** Stop polling after this and show the "we're checking" message. */
export const PAYMENT_CONFIRM_TIMEOUT_MS = 60_000;

/** Milliseconds left before a confirming screen must fall back to "still checking". */
export function confirmingTimeoutMs(
  startedAt: number,
  now = Date.now(),
  limit = PAYMENT_CONFIRM_TIMEOUT_MS,
): number {
  return Math.max(0, limit - Math.max(0, now - startedAt));
}

export const CONFIRMING_PAYMENT_MESSAGE = 'Confirming your payment…';
export const ORDER_CONFIRMED_HEADING = 'Order confirmed';
export const PAYMENT_STILL_CHECKING_MESSAGE =
  "We're checking your payment. Don't pay again. We'll email you once it's confirmed, or refund you automatically.";
export const ORDER_CONFIRMED_EMAIL =
  "A confirmation email is on its way. You'll receive tracking details once your shipment leaves origin.";

export function orderConfirmedThanks(totalLabel: string): string {
  return `Thank you for your order — total ${totalLabel}.`;
}

export type PaymentConfirmPhase = 'confirming' | 'confirmed' | 'checking' | 'cancelled';
export type PaymentPollResult = 'confirmed' | 'pending' | 'cancelled' | 'stopped';

const CONFIRMED_INDEX = ORDER_STATUS_FLOW.indexOf('confirmed');

/**
 * True when the order is confirmed or later in fulfilment (packed, shipped,
 * delivered) or returned. `placed` and `cancelled` are not confirmed.
 */
export function isOrderConfirmedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  if (status === 'returned') return true;
  const index = ORDER_STATUS_FLOW.indexOf(status as OrderStatus);
  return index >= CONFIRMED_INDEX;
}

/**
 * The signed-in customer's own order status. RLS orders_read already limits
 * the rows; filtering customer_id matches the account order page.
 * Null when the row is missing, unreadable, or the status isn't a string.
 *
 * The client argument is the browser Supabase client. Its filter builder is
 * thenable but not a Promise, so this stays untyped at the boundary.
 */
export async function readOwnOrderStatus(
  client: { from(table: string): any },
  orderId: string,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error || !data || typeof data.status !== 'string') return null;
  return data.status;
}

export interface OwnOrderCheckout {
  status: string;
  /** orders.cancel_reason. Null when the column is empty. */
  cancelReason: string | null;
}

/**
 * Status plus the cancel reason for the confirming screen. Same RLS path as
 * readOwnOrderStatus. A cancelled order (a payment that landed after the
 * hold expired) has to leave "we're checking" instead of waiting out the poll.
 */
export async function readOwnOrderCheckout(
  client: { from(table: string): any },
  orderId: string,
  customerId: string,
): Promise<OwnOrderCheckout | null> {
  const { data, error } = await client
    .from('orders')
    .select('status, cancel_reason')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error || !data || typeof data.status !== 'string') return null;
  const reason = data.cancel_reason;
  return {
    status: data.status,
    cancelReason: typeof reason === 'string' && reason.trim() ? reason : null,
  };
}

/**
 * Read status immediately, then every `intervalMs`, until it is confirmed,
 * the order is cancelled, or `timeoutMs` has passed. A cancelled order
 * resolves on that read: a late capture must not sit on "we're checking".
 * A read error counts as not confirmed and the loop continues. `shouldStop`
 * ends the loop without a verdict (the screen unmounted).
 */
export async function pollUntilPaymentConfirmed(
  readStatus: () => Promise<string | null>,
  options: {
    intervalMs?: number;
    timeoutMs?: number;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
    shouldStop?: () => boolean;
  } = {},
): Promise<PaymentPollResult> {
  const intervalMs = options.intervalMs ?? PAYMENT_CONFIRM_INTERVAL_MS;
  const timeoutMs = options.timeoutMs ?? PAYMENT_CONFIRM_TIMEOUT_MS;
  const sleep = options.sleep ?? ((ms: number) => new Promise((resolve) => { setTimeout(resolve, ms); }));
  const now = options.now ?? Date.now;
  const started = now();
  for (;;) {
    if (options.shouldStop?.()) return 'stopped';
    let status: string | null = null;
    try {
      status = await readStatus();
    } catch {
      status = null;
    }
    if (isOrderConfirmedStatus(status)) return 'confirmed';
    if (status === 'cancelled') return 'cancelled';
    const elapsed = now() - started;
    if (elapsed >= timeoutMs) return 'pending';
    const wait = Math.min(intervalMs, timeoutMs - elapsed);
    if (wait <= 0) return 'pending';
    await sleep(wait);
  }
}

/**
 * Standard Checkout: hide UPI Collect (typing a VPA / UPI id).
 * UPI Intent (mobile) and UPI QR (desktop) stay, per Razorpay's Collect
 * migration guide.
 */
export function razorpayDisplayConfig(): { display: { hide: { method: string; flows: string[] }[] } } {
  return {
    display: {
      hide: [{ method: 'upi', flows: ['collect'] }],
    },
  };
}
