import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { stayOnPageForAuthLinkError } from '../../src/lib/authLink';
import { checkoutPaymentError, paymentNotCompletedMessage } from '../../src/lib/checkout';
import { PIN_INVALID_MESSAGE, PIN_UNKNOWN_MESSAGE } from '../../src/lib/delivery';
import { formatIndiaDate } from '../../src/lib/indiaDate';
import {
  PAYMENT_NOT_COMPLETED_BADGE,
  PAYMENT_NOT_COMPLETED_HEADING,
  customerOrderHeadline,
  customerStatusLabel,
} from '../../src/lib/orderHeadline';
import { PHONE_INVALID_MESSAGE, PHONE_REQUIRED_MESSAGE } from '../../src/lib/phone';
import { NAME_INVALID_MESSAGE } from '../../src/lib/profile';
import { safeRedirectPath } from '../../src/lib/apiAuth';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

describe('F102 order lookup errors', () => {
  it('never prints the database message for a bad id', () => {
    const src = read('src/pages/AccountOrderDetail.tsx');
    expect(src).toContain("setError('Order not found.')");
    expect(src).not.toContain('err?.message');
    expect(src).not.toContain("setError(err.message)");
  });
});

describe('F115 India dates', () => {
  it('uses the Kolkata calendar day, not UTC', () => {
    // 27 Nov 2026 20:30 UTC is 28 Nov 2026 02:00 in India.
    const instant = '2026-11-27T20:30:00.000Z';
    expect(formatIndiaDate(instant, 'long')).toBe('28 November 2026');
    expect(formatIndiaDate(instant, 'short')).toMatch(/28/);
    expect(formatIndiaDate(instant, 'invoice')).toMatch(/28/);
  });
});

describe('F122 prepaid placed orders', () => {
  it('says payment was not completed, and leaves cash on delivery alone', () => {
    expect(customerOrderHeadline('placed', 'prepaid')).toBe(PAYMENT_NOT_COMPLETED_HEADING);
    expect(customerOrderHeadline('placed', 'cod')).toBe('We’re preparing your order.');
    expect(customerOrderHeadline('confirmed', 'prepaid')).toBe('We’re preparing your order.');
    expect(customerStatusLabel('placed', 'prepaid')).toBe(PAYMENT_NOT_COMPLETED_BADGE);
    expect(customerStatusLabel('placed', 'cod')).toBeNull();
  });
});

describe('F123 payment not completed names the order', () => {
  it('puts the order number in the closed-window message only', () => {
    expect(paymentNotCompletedMessage('C36-1001')).toBe(
      "Payment not completed for order C36-1001. If money left your account, don't pay again — we'll confirm your order automatically or refund you.",
    );
    expect(checkoutPaymentError('cancelled', null, 'C36-1001')).toContain('order C36-1001');
    expect(checkoutPaymentError('timed_out', null, 'C36-9')).toContain('order C36-9');
    expect(checkoutPaymentError('declined', { description: 'no' }, 'C36-1001')).not.toContain('C36-1001');
  });
});

describe('F126 /account/orders', () => {
  it('sends the route to /account, and sign-in only accepts a same-site return', () => {
    const app = read('src/App.tsx');
    expect(app).toContain('path="/account/orders"');
    expect(app).toContain("safeRedirectPath('/account', '/')");
    expect(safeRedirectPath('/account', '/')).toBe('/account');
    expect(safeRedirectPath('//evil.example', '/')).toBe('/');
    expect(safeRedirectPath('/\\evil', '/')).toBe('/');
  });
});

describe('F130 checkout messages', () => {
  it('keeps name, phone, and PIN as separate sentences', () => {
    const src = read('src/pages/Checkout.tsx');
    expect(src).not.toContain('Please enter your name and phone number.');
    expect(src).toContain('customerNameError(form.name)');
    expect(src).toContain('PHONE_REQUIRED_MESSAGE');
    expect(src).toContain('pinProblem(');
    expect(NAME_INVALID_MESSAGE).toBe('Enter your name.');
    expect(PHONE_REQUIRED_MESSAGE).toBe('Enter your phone number.');
    expect(PHONE_INVALID_MESSAGE).toContain('10-digit');
    expect(PIN_INVALID_MESSAGE).toBe('Enter a valid 6-digit PIN code.');
    expect(PIN_UNKNOWN_MESSAGE).toBe("That isn't a PIN code we recognise. Check it and try again.");
  });
});

describe('#80 reset link and resend', () => {
  it('keeps a used link on / when signed in, and on /auth either way', () => {
    expect(stayOnPageForAuthLinkError('/', true)).toBe(true);
    expect(stayOnPageForAuthLinkError('/', false)).toBe(false);
    expect(stayOnPageForAuthLinkError('/auth', true)).toBe(true);
    expect(stayOnPageForAuthLinkError('/auth', false)).toBe(true);
    expect(stayOnPageForAuthLinkError('/shop', true)).toBe(false);
    const auth = read('src/pages/Auth.tsx');
    expect(auth).toContain('if (arrivedWithLinkError.current || authLinkError) return;');
    expect(auth).toContain('if (resetting) return;');
    expect(auth).not.toContain('if (resetting || resetSent) return;');
  });
});

describe('F113 postal PIN host', () => {
  it('is on connect-src and the policy stays report-only', () => {
    const vercel = JSON.parse(read('vercel.json')) as {
      headers: { headers: { key: string; value: string }[] }[];
    };
    const headers = vercel.headers.flatMap((block) => block.headers);
    const report = headers.find((h) => h.key === 'Content-Security-Policy-Report-Only')?.value ?? '';
    expect(headers.some((h) => h.key === 'Content-Security-Policy')).toBe(false);
    const connect = report.split(';').map((part) => part.trim()).find((part) => part.startsWith('connect-src ')) ?? '';
    expect(connect).toContain('https://api.postalpincode.in');
  });
});

describe('F116 sign-out guard', () => {
  it('ignores a session that comes back while sign-out is in flight', () => {
    const src = read('src/context/AuthContext.tsx');
    expect(src).toContain('signingOutRef');
    expect(src).toContain('if (signingOutRef.current) return;');
    expect(read('src/pages/Account.tsx')).toContain('disabled={signingOut}');
    expect(read('src/components/ProfileDropdown.tsx')).toContain('disabled={signingOut}');
  });
});

describe('F124 and F125 narrow layout', () => {
  it('reserves cookie-bar height on a phone and lets the trust lines wrap', () => {
    expect(read('src/index.css')).toContain('padding-bottom: var(--cookie-banner-offset, 0px)');
    const band = read('src/components/TrustBand.tsx');
    expect(band).toContain('flex-wrap');
    expect(band).toContain('whitespace-normal md:whitespace-nowrap');
  });
});
