import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { InvoiceBreakup } from '../../src/lib/invoice-types';

/** P37b: notify, track and invoice copy (F44 F55 F56). */

vi.mock('../../src/lib/supabase', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
  isSupabaseConfigured: true,
  API_URL: '',
  initialAuthLink: { recovery: false, error: null, signupConfirmed: false },
}));

const { NotifyForm } = await import('../../src/components/NotifyMe');
const { NOTIFY_ALREADY, NOTIFY_CONFIRM } = await import('../../src/content/notifyCopy');
const { trackView, TRACK_STEPS } = await import('../../src/lib/trackStatus');
const { InvoiceTemplate } = await import('../../src/components/InvoiceTemplate');
const copy = await import('../../src/content/accountCopy');

const root = path.resolve(__dirname, '../..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');
const esc = (s: string) => s.replace(/'/g, '&#x27;');

function notifyHtml(status: 'done' | 'already') {
  return renderToStaticMarkup(createElement(NotifyForm, {
    productName: 'Dutch-process cocoa 500 g',
    status,
    fields: { email: 'baker@example.com', phone: '', audience: '', packSize: '', company: '' },
    fieldErrors: {},
    onChange: () => {},
    onSubmit: () => {},
    onClose: () => {},
  }));
}

describe('Notify me (F44)', () => {
  it('a repeat sign-up shows already-on-the-list, not the new-sign-up confirmation', () => {
    const html = notifyHtml('already');
    expect(html).toContain(esc(NOTIFY_ALREADY));
    expect(html).not.toContain(esc(NOTIFY_CONFIRM));
    expect(html).not.toContain('<form');
  });

  it('keeps the approved P34 wording', () => {
    expect(NOTIFY_ALREADY).toContain("We'll message you once when it's back. No marketing.");
    expect(notifyHtml('done')).toContain(esc(NOTIFY_CONFIRM));
  });

  it('ProductDetail only mounts NotifyMe; the write path lives in NotifyMe and server/notify', () => {
    expect(read('src/pages/ProductDetail.tsx')).not.toContain('/api/notify');
    expect(read('src/components/NotifyMe.tsx')).toContain("body.alreadyListed ? 'already' : 'done'");
  });
});

describe('/track (F55)', () => {
  const delivered = TRACK_STEPS.indexOf('delivered');

  it('a manual AWB matches admin Delivered although the shipment row is still in transit', () => {
    const v = trackView({ shipmentStatus: 'in_transit', orderStatus: 'delivered', manual: true });
    expect(v.activeIndex).toBe(delivered);
    expect(v.cancelled).toBe(false);
  });

  it('a manual AWB on a shipped order is in transit', () => {
    expect(trackView({ shipmentStatus: 'in_transit', orderStatus: 'shipped', manual: true }).activeIndex)
      .toBe(TRACK_STEPS.indexOf('in_transit'));
  });

  it('a courier scan that is further along still wins (live courier on)', () => {
    expect(trackView({ shipmentStatus: 'out_for_delivery', orderStatus: 'shipped', manual: false }).activeIndex)
      .toBe(TRACK_STEPS.indexOf('out_for_delivery'));
    expect(trackView({ shipmentStatus: 'pickup_scheduled', orderStatus: 'shipped', manual: false }).activeIndex)
      .toBe(TRACK_STEPS.indexOf('pickup_scheduled'));
  });

  it('cancelled and returned orders say so', () => {
    expect(trackView({ shipmentStatus: 'cancelled', orderStatus: 'packed', manual: true }).cancelled).toBe(true);
    expect(trackView({ shipmentStatus: 'in_transit', orderStatus: 'cancelled', manual: true }).cancelled).toBe(true);
    const r = trackView({ shipmentStatus: 'in_transit', orderStatus: 'returned', manual: true });
    expect(r.returned).toBe(true);
    expect(r.activeIndex).toBe(delivered);
  });

  it('a manual AWB gets no Shiprocket link, and the page reads the order status', () => {
    const src = read('src/pages/Track.tsx');
    expect(src).toContain('shiprocket_shipment_id, order:orders ( status )');
    expect(src).toMatch(/manual \?[\s\S]*TRACK_MANUAL_NOTE[\s\S]*shiprocket\.co\/tracking/);
  });
});

const BREAKUP: InvoiceBreakup = {
  isIntraState: true,
  sellerState: 'Test State',
  buyerState: 'Test State',
  lines: [{
    variantId: 'v1', productName: 'Dutch-process cocoa', sku: 'C36-1', hsnCode: '1805', sizeLabel: '500 g',
    qty: 1, gstRatePct: 18, unitInclPaise: 59000, netPerUnitPaise: 50000, gstPerUnitPaise: 9000,
    lineNetPaise: 50000, lineCgstPaise: 4500, lineSgstPaise: 4500, lineIgstPaise: 0, lineTotalPaise: 59000,
  }],
  subtotalNetPaise: 50000,
  totalCgstPaise: 4500,
  totalSgstPaise: 4500,
  totalIgstPaise: 0,
  totalShippingPaise: 0,
  totalAmountPaise: 59000,
};

describe('invoice copy (F56)', () => {
  const html = renderToStaticMarkup(createElement(InvoiceTemplate, {
    invoiceNumber: 'INV-1001',
    invoiceDate: new Date('2026-11-01T00:00:00+05:30'),
    orderNumber: 'C36-1001',
    orderDate: new Date('2026-11-01T00:00:00+05:30'),
    paymentMethod: 'prepaid',
    customer: { name: 'Asha Rao', email: 'asha@example.com', phone: '9000000000', gstin: null },
    ship: { name: 'Asha Rao', line1: '1 Test Lane', line2: '', city: 'Test City', state: 'Test State', pincode: '500001' },
    breakup: BREAKUP,
    settings: {
      storeName: 'COCO36',
      seller: {
        legalName: 'COCO36 Foods', gstin: '36AAAAA0000A1Z5', addressLine1: '12 Harbour Road', addressLine2: '',
        city: 'Test City', state: 'Test State', pincode: '500001', fssaiLicNo: null,
      },
    },
  }));

  it('prints the new footer and drops the e-invoicing hedge', () => {
    expect(html).toContain(copy.INVOICE_FOOTER);
    expect(html).not.toMatch(/e-invoicing/i);
  });

  it('has no PAN, bank, jurisdiction, or FSSAI line without a number (D5)', () => {
    expect(html).not.toMatch(/\bPAN\b|bank|IFSC|account no|jurisdiction|FSSAI/i);
    expect(html).toContain('GSTIN');
    expect(html).toContain('Place of Supply');
    expect(html).toContain('1805');
  });

  it('cancelled orders get their own copy, and a not-yet invoice promises no email', () => {
    const page = read('src/pages/AccountInvoice.tsx');
    expect(page).toContain('cancelled ? INVOICE_CANCELLED_NONE : INVOICE_NOT_YET');
    expect(page).toContain('INVOICE_CANCELLED_NOTE');
    expect(page).not.toMatch(/by email/i);
    expect(copy.INVOICE_NOT_YET).not.toMatch(/email|packed/i);
  });

  it('the account list and detail link an invoice only when one was issued', () => {
    expect(read('src/pages/Account.tsx')).toContain('{o.has_invoice ? (');
    expect(read('src/pages/AccountOrderDetail.tsx')).toContain('{order.has_invoice && (');
  });
});
