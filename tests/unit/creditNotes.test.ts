import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { loadOwnCreditNote, loadOwnCreditNotes, orderBillGstin, showCreditNotes } from '../../src/lib/creditNotes';
import { CreditNoteTemplate } from '../../src/components/CreditNoteTemplate';
import { creditNoteFromRows } from '../../src/lib/credit-note-types';

/**
 * P25 · the shopper's credit notes: read with their own session (RLS), never
 * the service key; printed with the Rule 53(1A) fields.
 */

const HEAD = {
  id: 'cn1', credit_note_number: 'TEST-CNW2627-00001', issued_at: '2026-11-27T06:00:00Z', status: 'issued', is_test: true,
  reason: 'Goods returned · RET-00007 · refund RFD-00009', order_id: 'o1', order_number: 'SO-0001', invoice_number: 'TEST-W2627-00003',
  invoice_date: '2026-11-20T06:00:00Z', return_number: 'RET-00007', refund_number: 'RFD-00009', gateway_refund_id: 'rfnd_abc123',
  taxable_paise: 1047, cgst_paise: 27, sgst_paise: 26, igst_paise: 0, total_paise: 1100, cancelled_at: null, cancel_reason: null,
};
const LINES = [
  { line_no: 1, kind: 'goods', invoice_line_no: 1, description: 'Cocoa · 250 g', sku: 'CHO-COCO-250G', hsn_code: '18050000', gst_rate: '5.00',
    qty: 2, unit_price_paise: 500, taxable_paise: 952, cgst_paise: 24, sgst_paise: 24, igst_paise: 0, total_paise: 1000 },
  { line_no: 2, kind: 'shipping', invoice_line_no: null, description: 'Delivery charges', gst_rate: '5.00', qty: 0, unit_price_paise: 0,
    taxable_paise: 95, cgst_paise: 3, sgst_paise: 2, igst_paise: 0, total_paise: 100 },
];

/** A chainable fake of the supabase-js query builder. */
function fakeClient(tables: Record<string, { data: unknown; error: unknown }>) {
  const calls: { table: string; select?: string; eq: [string, string][] }[] = [];
  const from = vi.fn((table: string) => {
    const call = { table, eq: [] as [string, string][], select: undefined as string | undefined };
    calls.push(call);
    const result = tables[table] ?? { data: null, error: { message: 'no table' } };
    const b: any = {
      select: (cols: string) => { call.select = cols; return b; },
      eq: (c: string, v: string) => { call.eq.push([c, v]); return b; },
      order: () => b,
      maybeSingle: () => Promise.resolve(result),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej),
    };
    return b;
  });
  return { client: { from }, calls };
}

describe('reads', () => {
  it('lists the order’s credit notes by order id', async () => {
    const { client, calls } = fakeClient({ credit_notes: { data: [HEAD], error: null } });
    expect(await loadOwnCreditNotes(client, 'o1')).toEqual([
      { id: 'cn1', number: 'TEST-CNW2627-00001', issuedAt: HEAD.issued_at, totalPaise: 1100, cancelled: false },
    ]);
    expect(calls[0]).toMatchObject({ table: 'credit_notes', eq: [['order_id', 'o1']] });
  });

  it('a failed read (migration not applied, RLS) shows no credit note', async () => {
    const { client } = fakeClient({ credit_notes: { data: null, error: { message: 'column does not exist' } } });
    expect(await loadOwnCreditNotes(client, 'o1')).toEqual([]);
    expect(await loadOwnCreditNote(client, 'o1', 'cn1')).toBeNull();
  });

  it('one note with its lines, scoped to the order; never asks for staff ids', async () => {
    const { client, calls } = fakeClient({ credit_notes: { data: HEAD, error: null }, credit_note_lines: { data: LINES, error: null } });
    const doc = await loadOwnCreditNote(client, 'o1', 'cn1');
    expect(doc?.lines).toHaveLength(2);
    const head = calls.find((c) => c.table === 'credit_notes')!;
    expect(head.eq).toEqual([['id', 'cn1'], ['order_id', 'o1']]);
    expect(head.select).not.toMatch(/issued_by|cancelled_by/);
  });

  it('uses the shopper session, not a service key', () => {
    const src = readFileSync(path.resolve(__dirname, '../../src/pages/AccountCreditNote.tsx'), 'utf8')
      + readFileSync(path.resolve(__dirname, '../../src/lib/creditNotes.ts'), 'utf8');
    expect(src).not.toMatch(/SERVICE_ROLE|service_role|server\//);
    expect(src).toMatch(/from '\.\.\/lib\/supabase'/);
  });
});

describe('print', () => {
  it('shows the Rule 53(1A) fields, RET, RFD and the Razorpay refund id', () => {
    const html = renderToStaticMarkup(createElement(CreditNoteTemplate, {
      doc: creditNoteFromRows(HEAD, LINES),
      seller: { legalName: 'COCO36 Foods Pvt Ltd', gstin: '37AAAAA0000A1Z5', addressLine1: '12 Harbour Road', addressLine2: '', city: 'Test City', state: 'Test State', pincode: '500001', fssaiLicNo: null },
      customer: { name: 'Alice', email: 'a@example.test', phone: '', gstin: null, line1: '1 Road', line2: '', city: 'City', state: 'Andhra Pradesh', pincode: '500002' },
      ship: { name: 'Alice', line1: '9 Delivery Lane', line2: '', city: 'Vizag', state: 'Andhra Pradesh', pincode: '530001' },
      codes: { seller: '37', buyer: '37' },
    }));
    for (const s of ['Credit Note', 'TEST-CNW2627-00001', 'COCO36 Foods Pvt Ltd', '37AAAAA0000A1Z5', 'Alice', 'TEST-W2627-00003', 'SO-0001',
      'Goods returned', '18050000', 'CGST', 'SGST', 'computer-generated credit note and does not need a signature', 'RET-00007', 'RFD-00009', 'rfnd_abc123', 'TEST CREDIT NOTE', '₹11.00']) {
      expect(html).toContain(s);
    }
    expect(html).not.toContain('IGST');
    expect(html).not.toContain('Authorised Signatory');
    // State codes for seller and place of supply; separate delivery address; unregistered marked.
    for (const s of ['State: Test State (37)', 'Ship To (delivery address)', '9 Delivery Lane', 'Andhra Pradesh (37)', 'Unregistered recipient']) {
      expect(html).toContain(s);
    }
  });
});

describe('business buyers only', () => {
  it('shows credit notes only when the order billing address carried a valid GSTIN', () => {
    expect(showCreditNotes('37AAAAA0000A1Z5')).toBe(true);
    expect(showCreditNotes(' 37aaaaa0000a1z5 ')).toBe(true);
    for (const v of [null, undefined, '', '   ', 'NOTAGSTIN', 42]) expect(showCreditNotes(v)).toBe(false);
  });

  it('reads the GSTIN from the order billing address (object or array embed)', () => {
    expect(orderBillGstin({ bill: { gstin: '37AAAAA0000A1Z5' } })).toBe('37AAAAA0000A1Z5');
    expect(orderBillGstin({ bill: [{ gstin: '37AAAAA0000A1Z5' }] })).toBe('37AAAAA0000A1Z5');
    expect(orderBillGstin({ bill: { gstin: null } })).toBeNull();
    expect(orderBillGstin({ bill: null })).toBeNull();
    expect(orderBillGstin(null)).toBeNull();
  });

  it('the order page and the credit note page both apply the gate', () => {
    for (const f of ['../../src/pages/AccountOrderDetail.tsx', '../../src/pages/AccountCreditNote.tsx']) {
      const src = readFileSync(path.resolve(__dirname, f), 'utf8');
      expect(src).toMatch(/showCreditNotes\(/);
      expect(src).toMatch(/bill:addresses!bill_address_id\s*\([^)]*gstin/);
    }
  });
});
