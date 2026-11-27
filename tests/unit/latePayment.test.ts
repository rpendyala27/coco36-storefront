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
  attemptForCart, attemptSignature, confirmingTimeoutMs, isCheckoutExpired, isOrderConfirmedStatus,
  paymentWindowMarginSeconds, paymentWindowSeconds, placedOrderMethod, pollUntilPaymentConfirmed,
  razorpayDisplayConfig, readOwnOrderCheckout, readOwnOrderStatus,
  CONFIRMING_PAYMENT_MESSAGE, ORDER_CONFIRMED_EMAIL, ORDER_CONFIRMED_HEADING,
  PAYMENT_CONFIRM_INTERVAL_MS, PAYMENT_CONFIRM_TIMEOUT_MS, PAYMENT_STILL_CHECKING_MESSAGE,
  CHECKOUT_EXPIRED_MESSAGE, ORDER_CHANGED_MESSAGE,
  PAYMENT_WINDOW_CLOSED_MESSAGE, PAYMENT_WINDOW_ENDED_MESSAGE, PAYMENT_WINDOW_MIN_SECONDS,
  orderConfirmedThanks,
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

  it('reads status and cancel reason for the confirming screen, and nothing else', async () => {
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
              maybeSingle: async () => ({
                data: { status: 'cancelled', cancel_reason: 'Payment not completed in time; stock released' },
                error: null,
              }),
            };
            return chain;
          },
        };
      },
    };
    await expect(readOwnOrderCheckout(client, 'order-1', 'user-1')).resolves.toEqual({
      status: 'cancelled',
      cancelReason: 'Payment not completed in time; stock released',
    });
    expect(calls).toEqual([
      'from:orders',
      'select:status, cancel_reason',
      'eq:id=order-1',
      'eq:customer_id=user-1',
    ]);
  });

  it('a cancelled order resolves on the first read, and does not wait out the checking timeout', async () => {
    let now = 0;
    let reads = 0;
    const result = await pollUntilPaymentConfirmed(async () => {
      reads += 1;
      return 'cancelled';
    }, {
      now: () => now,
      sleep: async (ms) => { now += ms; },
    });
    expect(result).toBe('cancelled');
    expect(reads).toBe(1);
    expect(now).toBe(0);
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

const details = {
  items: [{ sizeId: 'v1', quantity: 1 }],
  shipAddressId: 'ship-1',
  billAddressId: 'bill-1',
  paymentMethod: 'prepaid' as const,
  name: 'Asha',
  phone: '9848022338',
};

describe('same order when the window closes', () => {
  const signature = attemptSignature(details);
  const attempt = { key: 'chk_same', signature, placedAt: 50, paymentMethod: 'prepaid' as const };

  it('keeps the key and the placement time when the attempt signature is unchanged', () => {
    expect(attemptForCart(attempt, signature)).toEqual(attempt);
  });

  it('mints a new key when the cart changes, and drops the old placement time', () => {
    const next = attemptForCart(attempt, attemptSignature({ ...details, items: [{ sizeId: 'v1', quantity: 2 }] }));
    expect(next.key).not.toBe(attempt.key);
    expect(next.signature).not.toBe(signature);
    expect(next.placedAt).toBeUndefined();
    expect(next.paymentMethod).toBeUndefined();
  });

  it('mints a new key when the address, payment method, name, or phone changes and the cart does not', () => {
    const changes = [
      { shipAddressId: 'ship-2' },
      { billAddressId: 'bill-2' },
      { paymentMethod: 'cod' as const },
      { name: 'Meera' },
      { phone: '9876543210' },
    ];
    for (const change of changes) {
      const next = attemptForCart(attempt, attemptSignature({ ...details, ...change }));
      expect(next.key).not.toBe(attempt.key);
      expect(next.paymentMethod).toBeUndefined();
    }
  });

  it('keeps a fresh attempt key the first time a signature is attached', () => {
    expect(attemptForCart({ key: 'chk_new', signature: '' }, signature)).toEqual({ key: 'chk_new', signature });
  });

  it('checkout reuses the attempt on dismiss and does not release the order', () => {
    const src = read('src/pages/Checkout.tsx');
    const dismiss = sliceBetween(src, 'ondismiss:', 'rzp.on(');
    expect(dismiss).toContain('attempt.current = attemptForCart(attempt.current, sig);');
    expect(dismiss).not.toContain('freshAttempt');
    expect(dismiss).not.toContain('abandonCheckout');
    expect(dismiss).toContain('setError(checkoutPaymentError(outcomeOnDismiss(lastFailure, openedAt, windowSeconds), lastFailure, orderNumber));');
    expect(src).not.toContain('abandonCheckout');
    expect(src).toContain('shipAddressId: selectedShipId');
    expect(src).toContain('billAddressId,');
    expect(src).toContain('name: form.name.trim()');
    expect(src).toContain('phone: customerPhone');

    const tooShort = sliceBetween(src, 'if (windowSeconds === null)', 'let lastFailure');
    expect(tooShort).not.toContain('freshAttempt');
    expect(tooShort).toContain('setError(PAYMENT_WINDOW_ENDED_MESSAGE);');
    expect(tooShort).not.toContain("paymentMessage('timed_out')");
    expect(tooShort).not.toContain('don\'t pay again');

    const handler = sliceBetween(src, 'handler:', 'modal:');
    expect(handler).toContain('freshAttempt()');
    expect(handler).toContain("phase: typeof orderId === 'string' && orderId ? 'confirming' : 'checking'");
    expect(handler).toContain('confirmStartedAt: Date.now()');
  });
});

describe('payment method on a reused order', () => {
  it('follows the server method, so switching to COD does not confirm a prepaid order', () => {
    expect(placedOrderMethod({
      serverPaymentMethod: 'prepaid',
      requested: 'cod',
      attemptMethod: 'prepaid',
    })).toEqual({ method: 'prepaid', mismatch: false });
    expect(placedOrderMethod({
      serverPaymentMethod: 'cod',
      requested: 'cod',
    })).toEqual({ method: 'cod', mismatch: false });
  });

  it('a reused order with no payment_method and a different method is a new attempt', () => {
    expect(placedOrderMethod({
      serverPaymentMethod: undefined,
      requested: 'cod',
      attemptMethod: 'prepaid',
    })).toEqual({ method: 'prepaid', mismatch: true });
    expect(placedOrderMethod({
      serverPaymentMethod: null,
      requested: 'prepaid',
    })).toEqual({ method: 'prepaid', mismatch: false });
  });

  it('checkout confirms only the method the server returned', () => {
    const src = read('src/pages/Checkout.tsx');
    const decided = sliceBetween(src, 'const placedMethod = placedOrderMethod({', 'Prepaid — open Razorpay');
    expect(decided).toContain('serverPaymentMethod: payload.payment_method');
    expect(decided).toContain('if (placedMethod.mismatch)');
    expect(decided).toContain('setError(ORDER_CHANGED_MESSAGE);');
    expect(decided).toContain('freshAttempt()');
    expect(decided).toContain("if (placedMethod.method === 'cod')");
    expect(decided).not.toContain("if (paymentMethod === 'cod')");
  });
});

describe('payment window ended', () => {
  it('under a minute left keeps the ended copy, and does not say the checkout was cancelled', () => {
    expect(PAYMENT_WINDOW_ENDED_MESSAGE).toBe(
      "This payment window has ended. If you paid, we'll confirm your order automatically. Otherwise you can try again in a few minutes.",
    );
    expect(PAYMENT_WINDOW_ENDED_MESSAGE).not.toMatch(/don't pay again|refund it in full/i);
    const src = read('src/pages/Checkout.tsx');
    const tooShort = sliceBetween(src, 'if (windowSeconds === null)', 'let lastFailure');
    expect(tooShort).toContain('setError(PAYMENT_WINDOW_ENDED_MESSAGE);');
    expect(tooShort).not.toContain('CHECKOUT_EXPIRED_MESSAGE');
    expect(tooShort).not.toContain('freshAttempt');
  });

  it('409 checkout_expired tells the shopper to place the order again and mints a new attempt', () => {
    expect(CHECKOUT_EXPIRED_MESSAGE).toBe(
      "Your previous checkout expired. If you paid, we'll refund it in full. Place your order again to continue.",
    );
    expect(CHECKOUT_EXPIRED_MESSAGE).not.toBe(PAYMENT_WINDOW_ENDED_MESSAGE);
    expect(isCheckoutExpired(409, 'checkout_expired')).toBe(true);
    expect(isCheckoutExpired(409, 'out_of_stock')).toBe(false);
    expect(isCheckoutExpired(400, 'checkout_expired')).toBe(false);
    const src = read('src/pages/Checkout.tsx');
    const expired = sliceBetween(src, 'if (isCheckoutExpired(orderRes.status, payload.code))', 'The server answered');
    expect(expired).toContain('freshAttempt()');
    expect(expired).toContain('setError(CHECKOUT_EXPIRED_MESSAGE);');
    expect(expired).not.toContain('PAYMENT_WINDOW_ENDED_MESSAGE');
  });

  it('a payment-method mismatch asks the shopper to tap Pay again', () => {
    expect(ORDER_CHANGED_MESSAGE).toBe('Something changed in your order. Please tap Pay again.');
    const src = read('src/pages/Checkout.tsx');
    const mismatch = sliceBetween(src, 'if (placedMethod.mismatch)', 'if (!attempt.current.paymentMethod)');
    expect(mismatch).toContain('freshAttempt()');
    expect(mismatch).toContain('setError(ORDER_CHANGED_MESSAGE);');
  });
});

describe('confirming screen without a signed-in user', () => {
  it('the fallback is 60 seconds from when confirmation started, and never negative', () => {
    expect(confirmingTimeoutMs(1_000, 1_000)).toBe(PAYMENT_CONFIRM_TIMEOUT_MS);
    expect(confirmingTimeoutMs(1_000, 1_000 + 10_000)).toBe(50_000);
    expect(confirmingTimeoutMs(1_000, 1_000 + PAYMENT_CONFIRM_TIMEOUT_MS + 5)).toBe(0);
  });

  it('checkout still leaves Confirming when the user id is missing', () => {
    const src = read('src/pages/Checkout.tsx');
    const effect = sliceBetween(src, 'const remaining = confirmingTimeoutMs(confirmStartedAt);', '}, [watchId, customerId, confirmStartedAt]);');
    expect(effect).toContain('if (!customerId)');
    expect(effect).toContain("const timer = setTimeout(() => apply('pending'), remaining);");
    expect(effect).toContain('timeoutMs: remaining');
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
    expect(src).toContain('readOwnOrderCheckout(supabase, watchId, customerId)');
    expect(src).toContain("result === 'cancelled' ? 'cancelled' : 'checking'");
    expect(src).toContain('cancelReason={confirmedOrder.cancelReason}');
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

  it('a late capture on a cancelled order says the refund is queued, and stops checking', () => {
    const page = renderToStaticMarkup(createElement(PaymentResult, {
      phase: 'cancelled',
      orderNumber: 'C36-1001',
      totalPaise: 315400,
      cancelReason: 'Payment not completed in time; stock released',
    })).replace(/&#x27;/g, "'");
    expect(page).toContain('Cancelled.');
    expect(page).toContain('text-sm');
    expect(page).toContain('Payment not completed in time');
    expect(page).toContain('Order cancelled. Your refund of ₹3,154 is being processed.');
    expect(page).not.toContain('We received your payment after this order was cancelled');
    expect(page).not.toContain(PAYMENT_STILL_CHECKING_MESSAGE);
    expect(page).not.toContain(ORDER_CONFIRMED_HEADING);
    expect(page).not.toContain('stock released');
    expect(page).toContain('Continue shopping');
  });
});
