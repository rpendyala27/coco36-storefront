import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * P37a checkout state: decline vs cancel (F28), the Razorpay window vs the
 * 30-minute unpaid hold (R08), the phone rule (F49) and the PIN check (F45).
 */

vi.mock('../../src/lib/supabase', () => ({ API_URL: 'https://admin.example.test', supabase: {} }));

const {
  classifyPaymentFailure, outcomeOnDismiss, paymentMessage, paymentWindowSeconds, PAYMENT_MESSAGES,
  PAYMENT_WINDOW_MARGIN_SECONDS, UNPAID_HOLD_MINUTES,
} = await import('../../src/lib/checkout');
const { INDIAN_MOBILE_RE, isIndianMobile, normaliseIndianMobile } = await import('../../src/lib/phone');
const {
  forgetPincode, isCheckablePin, pinProblem, PIN_INVALID_MESSAGE, PIN_UNKNOWN_MESSAGE, rememberPincode, savedPincode, showsWaitlist,
} = await import('../../src/lib/delivery');
const { DeliveryAnswer } = await import('../../src/components/CheckDelivery');

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('payment outcomes (F28)', () => {
  it('sorts Razorpay failures by code and reason', () => {
    expect(classifyPaymentFailure({ code: 'BAD_REQUEST_ERROR', reason: 'payment_cancelled', source: 'customer' })).toBe('cancelled');
    expect(classifyPaymentFailure({ code: 'BAD_REQUEST_ERROR', reason: 'payment_failed', source: 'bank', description: 'Your payment has been declined by the bank' })).toBe('declined');
    expect(classifyPaymentFailure({ code: 'BAD_REQUEST_ERROR', reason: 'insufficient_funds' })).toBe('declined');
    expect(classifyPaymentFailure({ code: 'GATEWAY_ERROR', reason: 'payment_failed' })).toBe('declined');
    expect(classifyPaymentFailure({ code: 'BAD_REQUEST_ERROR', reason: 'payment_timed_out' })).toBe('timed_out');
    expect(classifyPaymentFailure({ code: 'SERVER_ERROR' })).toBe('error');
    expect(classifyPaymentFailure(undefined)).toBe('error');
  });

  it('decline and cancel show different messages', () => {
    const decline = paymentMessage('declined', { description: 'Your payment has been declined by the bank.' });
    const cancel = paymentMessage('cancelled');
    expect(decline).not.toBe(cancel);
    expect(decline).toBe('Your bank declined the payment (Your payment has been declined by the bank). Your bag is unchanged; try again or pay another way.');
    expect(cancel).toBe(PAYMENT_MESSAGES.cancelled);
    expect(paymentMessage('declined', {})).toBe('Your bank declined the payment. Your bag is unchanged; try again or pay another way.');
    expect(paymentMessage('timed_out')).toBe(PAYMENT_MESSAGES.timedOut);
    expect(paymentMessage('error', { description: 'undefined' })).toBe("The payment didn't go through. Your bag is unchanged; please try again.");
  });

  it('closing the window after a decline keeps the decline, not "cancelled"', () => {
    const opened = 1_000_000;
    const decline = { code: 'BAD_REQUEST_ERROR', reason: 'payment_failed' };
    expect(outcomeOnDismiss(decline, opened, 1740, opened + 30_000)).toBe('declined');
    expect(outcomeOnDismiss(null, opened, 1740, opened + 30_000)).toBe('cancelled');
    expect(outcomeOnDismiss(null, opened, 1740, opened + 1740_000)).toBe('timed_out');
  });

  it('checkout wires both handlers through these helpers', () => {
    const src = read('src/pages/Checkout.tsx');
    expect(src).toContain('lastFailure = resp?.error ?? {};');
    expect(src).toContain('setError(paymentMessage(classifyPaymentFailure(lastFailure), lastFailure));');
    expect(src).toContain('setError(paymentMessage(outcomeOnDismiss(lastFailure, openedAt, windowSeconds), lastFailure));');
    expect(src).not.toContain("setError('Payment cancelled.");
  });
});

describe('Razorpay window vs the unpaid hold (R08)', () => {
  it('is 30 minutes less a 1-minute margin, less time since the order was placed', () => {
    expect(UNPAID_HOLD_MINUTES).toBe(30);
    expect(PAYMENT_WINDOW_MARGIN_SECONDS).toBe(60);
    const placed = 5_000_000;
    expect(paymentWindowSeconds(placed, placed)).toBe(29 * 60);
    expect(paymentWindowSeconds(placed, placed + 10 * 60_000)).toBe(19 * 60);
    expect(paymentWindowSeconds(placed, placed + 28 * 60_000)).toBe(60);
    expect(paymentWindowSeconds(placed, placed + 28 * 60_000 + 1000)).toBeNull();
  });

  it('never outlasts the hold', () => {
    const placed = 0;
    for (const elapsedMin of [0, 1, 5, 15, 27]) {
      const w = paymentWindowSeconds(placed, elapsedMin * 60_000)!;
      expect(elapsedMin * 60 + w).toBeLessThan(UNPAID_HOLD_MINUTES * 60);
    }
  });

  it('checkout passes it as Razorpay `timeout` and keeps the first placement time per attempt', () => {
    const src = read('src/pages/Checkout.tsx');
    expect(src).toContain('timeout:  windowSeconds,');
    expect(src).toContain('const windowSeconds = paymentWindowSeconds(attempt.current.placedAt);');
    expect(src).toContain('if (!attempt.current.placedAt) attempt.current.placedAt = Date.now();');
  });
});

describe('phone rule (F49)', () => {
  it('is ^[6-9]\\d{9}$ after dropping +91 / 91 / 0 and formatting', () => {
    expect(INDIAN_MOBILE_RE.source).toBe('^[6-9]\\d{9}$');
    expect(normaliseIndianMobile('98480 22338')).toBe('9848022338');
    expect(normaliseIndianMobile('+91 98480-22338')).toBe('9848022338');
    expect(normaliseIndianMobile('919848022338')).toBe('9848022338');
    expect(normaliseIndianMobile('09848022338')).toBe('9848022338');
    expect(isIndianMobile('5848022338')).toBe(false);
    expect(isIndianMobile('984802233')).toBe(false);
    expect(isIndianMobile('98480223381')).toBe(false);
    expect(isIndianMobile('')).toBe(false);
  });

  it('refuses placeholder numbers such as 9999999999', () => {
    expect(isIndianMobile('9999999999')).toBe(false);
    expect(isIndianMobile('+91 6666666666')).toBe(false);
  });

  it('is enforced at signup (optional field) and checkout; checkout prefill is unchanged (F30)', () => {
    const auth = read('src/pages/Auth.tsx');
    expect(auth).toContain('if (phone.trim() && !phoneDigits) throw new Error(PHONE_INVALID_MESSAGE);');
    expect(auth).toContain('phone: phoneDigits ?? undefined');
    const checkout = read('src/pages/Checkout.tsx');
    expect(checkout).toContain('const customerPhone = normaliseIndianMobile(form.phone);');
    expect(checkout).toContain('customerPhone,');
    expect(checkout).toContain("phone:   profile?.phone ?? '',");
    expect(checkout).toContain("phone: f.phone || profile?.phone || '',");
  });
});

describe('PIN check (F45)', () => {
  it('refuses PINs that are not real India Post PINs', () => {
    expect(pinProblem('12345')).toBe(PIN_INVALID_MESSAGE);
    expect(pinProblem('012345')).toBe(PIN_INVALID_MESSAGE);
    expect(pinProblem('100000')).toBe(PIN_UNKNOWN_MESSAGE);
    expect(pinProblem('999999')).toBe(PIN_UNKNOWN_MESSAGE);
    expect(pinProblem('290001')).toBe(PIN_UNKNOWN_MESSAGE);
    expect(pinProblem('550001')).toBe(PIN_UNKNOWN_MESSAGE);
    expect(pinProblem('880001')).toBe(PIN_UNKNOWN_MESSAGE);
    for (const ok of ['110001', '400001', '530001', '600001', '700001', '744101', '682555', '194101', '799001', '854301']) {
      expect(isCheckablePin(ok)).toBe(true);
    }
  });

  it('shows the waitlist for a real PIN we do not serve, not for other refusals', () => {
    expect(showsWaitlist({ deliverable: false, reason: 'no_zone' })).toBe(true);
    expect(showsWaitlist({ deliverable: false, reason: 'blocked' })).toBe(true);
    expect(showsWaitlist({ deliverable: false, reason: 'not_serviceable' })).toBe(true);
    expect(showsWaitlist({ deliverable: false, reason: 'item_restricted' })).toBe(false);
    expect(showsWaitlist({ deliverable: true, reason: 'ok' })).toBe(false);
    const html = renderToStaticMarkup(createElement(DeliveryAnswer, {
      pin: '744101',
      result: { deliverable: false, reason: 'no_zone', message: null, etaMin: null, etaMax: null, shippingFeePaise: null, freeThresholdPaise: null, codExtraPaise: null, codAllowed: false, restrictedItems: [] },
    }));
    expect(html).toContain('Email me when you deliver here');
  });

  describe('remembered PIN', () => {
    const store = new Map<string, string>();
    const ls = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => { store.set(k, v); },
      removeItem: (k: string) => { store.delete(k); },
    };

    it('is only kept and pre-filled when it is a real PIN; a bad one is dropped', () => {
      vi.stubGlobal('window', { localStorage: ls });
      store.clear();
      rememberPincode('999999');
      expect(savedPincode()).toBe('');
      rememberPincode('530001');
      expect(savedPincode()).toBe('530001');
      store.set('coco36.pincode', '100000');
      expect(savedPincode()).toBe('');
      expect(store.has('coco36.pincode')).toBe(false);
      rememberPincode('530001');
      forgetPincode();
      expect(savedPincode()).toBe('');
    });

    it('the checker and checkout remember a PIN only when it is served', () => {
      const box = read('src/components/CheckDelivery.tsx');
      expect(box).toContain('if (r.deliverable) rememberPincode(p);');
      expect(box).toContain('else forgetPincode();');
      expect(box).not.toMatch(/value=\{?['"]\d{6}/);
      const checkout = read('src/pages/Checkout.tsx');
      expect(checkout).toContain('if (r.deliverable) rememberPincode(shipAddr.pincode);');
    });
  });
});
