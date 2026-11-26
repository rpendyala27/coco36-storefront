import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

/**
 * Late-payment checkout: wait for orders.status before "Order confirmed",
 * reuse the attempt when the window closes, 10-minute payment window with a
 * 5-minute floor, window-close copy, and hide UPI Collect.
 */

vi.mock('../../src/lib/supabase', () => ({
  API_URL: 'https://admin.example.test',
  RAZORPAY_KEY_ID: 'rzp_test',
  supabase: {},
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, className }: { to: string; children: string; className?: string }) =>
    createElement('a', { href: to, className }, children),
}));

const {
  attemptForCart, isOrderConfirmedStatus, paymentWindowMarginSeconds, paymentWindowSeconds,
  pollUntilPaymentConfirmed, razorpayDisplayConfig, readOwnOrderStatus,
  CONFIRMING_PAYMENT_MESSAGE, ORDER_CONFIRMED_EMAIL, ORDER_CONFIRMED_HEADING,
  PAYMENT_CONFIRM_INTERVAL_MS, PAYMENT_CONFIRM_TIMEOUT_MS, PAYMENT_STILL_CHECKING_MESSAGE,
  PAYMENT_WINDOW_CLOSED_MESSAGE, PAYMENT_WINDOW_MIN_SECONDS, orderConfirmedThanks,
} = await import('../../src/lib/checkout');
const { PaymentResult } = await import('../../src/components/PaymentResult');

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

function sliceBetween(src: string, start: string, end: string): string {
  const i = src.indexOf(start);
  const j = src.indexOf(end, i + start.length);
  expect(i).toBeGreaterThanOrEqual(0);
  expect(j).toBeGreaterThan(i);
  return src.slice(i, j);
}

const html = (phase: 'confirming' | 'confirmed' | 'checking') =>
  renderToStaticMarkup(createElement(PaymentResult, {
    phase, orderNumber: 'C36-1001', totalPaise: 315400,
  })).replace(/&#x27;/g, "'");

describe('payment confirmation poll', () => {
  it('treats confirmed and later statuses as confirmed, and placed or cancelled as not', () => {
    for (const status of ['confirmed', 'packed', 'shipped', 'delivered', 'returned']) {
      expect(isOrderConfirmedStatus(status)).toBe(true);
    }
    for (const status of ['placed', 'cancelled', '', null, undefined]) {
      expect(isOrderConfirmedStatus(status)).toBe(false);
    }
  });

  it('reads the customer\'s own order status and nothing else', async () => {
    const calls: string[] = [];
    const client = {
      from(table: string) {
        calls.push(`from:${table}`);
        return {
          select(columns: string) {
            calls.push(`select:${columns}`);
            const chain = {
              eq(column: string, value: string) {
                calls.push(`eq:${column}=${value}`);
                return chain;
              },
              maybeSingle: async () => ({ data: { status: 'confirmed' }, error: null }),
            };
            return chain;
          },
        };
      },
    };
    await expect(readOwnOrderStatus(client, 'order-1', 'user-1')).resolves.toBe('confirmed');
    expect(calls).toEqual([
      'from:orders',
      'select:status',
      'eq:id=order-1',
      'eq:customer_id=user-1',
    ]);
    const denied = {
      from: () => ({
        select: () => {
          const chain = {
            eq: () => chain,
            maybeSingle: async () => ({ data: null, error: { message: 'no row' } }),
          };
          return chain;
        },
      }),
    };
    await expect(readOwnOrderStatus(denied, 'order-1', 'user-1')).resolves.toBeNull();
  });

  it('polls immediately and then every 3 seconds, and confirms as soon as the status moves', async () => {
    expect(PAYMENT_CONFIRM_INTERVAL_MS).toBe(3_000);
    expect(PAYMENT_CONFIRM_TIMEOUT_MS).toBe(60_000);
    let now = 0;
    const seen: number[] = [];
    const statuses = ['placed', 'placed', 'packed'];
    const result = await pollUntilPaymentConfirmed(async () => {
      seen.push(now);
      return statuses[seen.length - 1] ?? 'placed';
    }, {
      now: () => now,
      sleep: async (ms) => { now += ms; },
    });
    expect(result).toBe('confirmed');
    expect(seen).toEqual([0, 3_000, 6_000]);
  });

  it('stops after 60 seconds when the order is still placed', async () => {
    let now = 0;
    let reads = 0;
    const result = await pollUntilPaymentConfirmed(async () => {
      reads += 1;
      return 'placed';
    }, {
      now: () => now,
      sleep: async (ms) => { now += ms; },
    });
    expect(result).toBe('pending');
    expect(now).toBe(60_000);
    expect(reads).toBe(21);
  });

  it('keeps polling after a read error, and stops when the screen goes away', async () => {
    let now = 0;
    let reads = 0;
    const result = await pollUntilPaymentConfirmed(async () => {
      reads += 1;
      throw new Error('offline');
    }, {
      now: () => now,
      sleep: async (ms) => { now += ms; },
      timeoutMs: 3_000,
    });
    expect(result).toBe('pending');
    expect(reads).toBe(2);

    let asked = 0;
    const stopped = await pollUntilPaymentConfirmed(async () => {
      asked += 1;
      return 'placed';
    }, { shouldStop: () => true });
    expect(stopped).toBe('stopped');
    expect(asked).toBe(0);
  });
});

describe('same order when the window closes', () => {
  const attempt = { key: 'chk_same', cart: 'v1:1', placedAt: 50 };

  it('keeps the key and the placement time when the cart is unchanged', () => {
    expect(attemptForCart(attempt, 'v1:1')).toEqual(attempt);
  });

  it('mints a new key only when the cart changes, and drops the old placement time', () => {
    const next = attemptForCart(attempt, 'v1:2');
    expect(next.key).not.toBe(attempt.key);
    expect(next.cart).toBe('v1:2');
    expect(next.placedAt).toBeUndefined();
  });

  it('keeps a fresh attempt key the first time a cart is attached', () => {
    expect(attemptForCart({ key: 'chk_new', cart: '' }, 'v1:1')).toEqual({ key: 'chk_new', cart: 'v1:1' });
  });

  it('checkout reuses the attempt on dismiss and does not release the order', () => {
    const src = read('src/pages/Checkout.tsx');
    const dismiss = sliceBetween(src, 'ondismiss:', 'rzp.on(');
    expect(dismiss).toContain('attempt.current = attemptForCart(attempt.current, cartSignature(items));');
    expect(dismiss).not.toContain('freshAttempt');
    expect(dismiss).not.toContain('abandonCheckout');
    expect(dismiss).toContain('setError(paymentMessage(outcomeOnDismiss(lastFailure, openedAt, windowSeconds), lastFailure));');
    expect(src).not.toContain('abandonCheckout');

    const tooShort = sliceBetween(src, 'if (windowSeconds === null)', 'let lastFailure');
    expect(tooShort).not.toContain('freshAttempt');
    expect(tooShort).toContain("setError(paymentMessage('timed_out'));");

    const handler = sliceBetween(src, 'handler:', 'modal:');
    expect(handler).toContain('freshAttempt()');
    expect(handler).toContain("phase: typeof orderId === 'string' && orderId ? 'confirming' : 'checking'");
  });
});

describe('payment window margin', () => {
  const placed = Date.parse('2026-11-23T10:00:00.000Z');

  it('uses 10 minutes when that still leaves 5, and the old 60 seconds when the hold is shorter', () => {
    expect(PAYMENT_WINDOW_MIN_SECONDS).toBe(5 * 60);
    expect(paymentWindowMarginSeconds(15 * 60)).toBe(600);
    expect(paymentWindowMarginSeconds(30 * 60)).toBe(600);
    expect(paymentWindowMarginSeconds(14 * 60)).toBe(60);
    expect(paymentWindowMarginSeconds(10 * 60)).toBe(60);
    expect(paymentWindowSeconds(placed, placed, { unpaidHoldMinutes: 14 })).toBe(13 * 60);
    expect(paymentWindowSeconds(placed, placed + 12 * 60_000, { unpaidHoldMinutes: 14 })).toBe(60);
    expect(paymentWindowSeconds(placed, placed + 12 * 60_000 + 1000, { unpaidHoldMinutes: 14 })).toBeNull();
    expect(paymentWindowSeconds(placed, placed, { unpaidHoldMinutes: 15 })).toBe(5 * 60);
  });
});

describe('window-close copy and UPI Collect', () => {
  it('hides only the UPI collect flow', () => {
    expect(razorpayDisplayConfig()).toEqual({
      display: { hide: [{ method: 'upi', flows: ['collect'] }] },
    });
    const src = read('src/pages/Checkout.tsx');
    expect(src).toContain('config:   razorpayDisplayConfig(),');
    const options = sliceBetween(src, 'new window.Razorpay({', 'handler:');
    expect(options).toContain('razorpayDisplayConfig()');
    expect(options).not.toContain("flows: ['intent']");
    expect(options).not.toContain("flows: ['qr']");
  });

  it('checkout polls the order and shows each phase\'s copy', () => {
    const src = read('src/pages/Checkout.tsx');
    expect(src).toContain('pollUntilPaymentConfirmed(');
    expect(src).toContain('() => readOwnOrderStatus(supabase, watchId, customerId)');
    expect(src).toContain("phase: result === 'confirmed' ? 'confirmed' : 'checking'");
    expect(src).toContain('<PaymentResult');
  });
});

describe('confirmation screen copy', () => {
  it('says it is confirming, and does not say the order is confirmed', () => {
    const page = html('confirming');
    expect(page).toContain(`<h1 class="text-5xl mb-6">${CONFIRMING_PAYMENT_MESSAGE}</h1>`);
    expect(page).toContain('Order C36-1001');
    expect(page).not.toContain(ORDER_CONFIRMED_HEADING);
    expect(page).not.toContain(PAYMENT_STILL_CHECKING_MESSAGE);
    expect(page).not.toContain('Thank you');
    expect(page).not.toContain('Continue shopping');
  });

  it('says the order is confirmed only for that phase, with the thank-you lines', () => {
    const page = html('confirmed');
    expect(page).toContain(ORDER_CONFIRMED_HEADING);
    expect(page).toContain(orderConfirmedThanks('₹3,154'));
    expect(page).toContain(ORDER_CONFIRMED_EMAIL);
    expect(page).toContain('Continue shopping');
    expect(page).toContain('Back to home');
    expect(page).not.toContain(CONFIRMING_PAYMENT_MESSAGE);
    expect(page).not.toContain(PAYMENT_STILL_CHECKING_MESSAGE);
  });

  it('after the poll, tells the shopper not to pay again', () => {
    const page = html('checking');
    expect(page).toContain(`<h1 class="text-3xl md:text-4xl mb-6 leading-snug">${PAYMENT_STILL_CHECKING_MESSAGE}</h1>`);
    expect(page).toContain('Order C36-1001');
    expect(page).not.toContain(ORDER_CONFIRMED_HEADING);
    expect(page).not.toContain(CONFIRMING_PAYMENT_MESSAGE);
    expect(page).not.toContain('Thank you');
    expect(PAYMENT_WINDOW_CLOSED_MESSAGE).toBe(
      "Payment not completed. If money left your account, don't pay again — we'll confirm your order automatically or refund you.",
    );
  });
});
