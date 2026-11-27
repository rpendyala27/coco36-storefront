/**
 * P25 · GST credit note shape, as stored (credit_notes + credit_note_lines)
 * and as printed. Pure: no imports, so the storefront copy stays identical.
 *
 * ⚠️ MIRROR: coco36-storefront/src/lib/credit-note-types.ts is a byte-identical
 * copy. Edit both together.
 */

export interface CreditNoteLine {
  lineNo:         number;
  kind:           'goods' | 'shipping';
  invoiceLineNo:  number | null;
  description:    string;
  sku:            string | null;
  hsnCode:        string | null;
  gstRatePct:     number;
  qty:            number;
  unitPricePaise: number;
  taxablePaise:   number;
  cgstPaise:      number;
  sgstPaise:      number;
  igstPaise:      number;
  totalPaise:     number;
}

export interface CreditNoteDoc {
  id:              string;
  number:          string;
  issuedAt:        string;
  status:          'issued' | 'cancelled';
  cancelledAt:     string | null;
  cancelReason:    string | null;
  isTest:          boolean;
  reason:          string;
  orderId:         string;
  orderNumber:     string;
  invoiceNumber:   string;
  invoiceDate:     string;
  returnNumber:    string | null;
  refundNumber:    string | null;
  gatewayRefundId: string | null;
  taxablePaise:    number;
  cgstPaise:       number;
  sgstPaise:       number;
  igstPaise:       number;
  totalPaise:      number;
  lines:           CreditNoteLine[];
}

/** Columns a signed-in shopper may read (no issued_by / cancelled_by). */
export const CREDIT_NOTE_COLUMNS =
  'id, credit_note_number, issued_at, status, cancelled_at, cancel_reason, is_test, reason, order_id, order_number, ' +
  'invoice_number, invoice_date, return_number, refund_number, gateway_refund_id, ' +
  'taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise';

export const CREDIT_NOTE_LINE_COLUMNS =
  'credit_note_id, line_no, kind, invoice_line_no, description, sku, hsn_code, gst_rate, qty, unit_price_paise, ' +
  'taxable_paise, cgst_paise, sgst_paise, igst_paise, total_paise';

type Row = Record<string, unknown>;
const num = (v: unknown) => (v === null || v === undefined || v === '' ? 0 : Number(v));
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v : null);

export function creditNoteLineFromRow(r: Row): CreditNoteLine {
  return {
    lineNo:         num(r.line_no),
    kind:           r.kind === 'shipping' ? 'shipping' : 'goods',
    invoiceLineNo:  r.invoice_line_no === null || r.invoice_line_no === undefined ? null : num(r.invoice_line_no),
    description:    text(r.description) ?? '',
    sku:            text(r.sku),
    hsnCode:        text(r.hsn_code),
    gstRatePct:     num(r.gst_rate),
    qty:            num(r.qty),
    unitPricePaise: num(r.unit_price_paise),
    taxablePaise:   num(r.taxable_paise),
    cgstPaise:      num(r.cgst_paise),
    sgstPaise:      num(r.sgst_paise),
    igstPaise:      num(r.igst_paise),
    totalPaise:     num(r.total_paise),
  };
}

export function creditNoteFromRows(head: Row, lines: Row[]): CreditNoteDoc {
  return {
    id:              String(head.id),
    number:          String(head.credit_note_number ?? ''),
    issuedAt:        String(head.issued_at ?? ''),
    status:          head.status === 'cancelled' ? 'cancelled' : 'issued',
    cancelledAt:     text(head.cancelled_at),
    cancelReason:    text(head.cancel_reason),
    isTest:          Boolean(head.is_test),
    reason:          text(head.reason) ?? '',
    orderId:         String(head.order_id ?? ''),
    orderNumber:     String(head.order_number ?? ''),
    invoiceNumber:   String(head.invoice_number ?? ''),
    invoiceDate:     String(head.invoice_date ?? ''),
    returnNumber:    text(head.return_number),
    refundNumber:    text(head.refund_number),
    gatewayRefundId: text(head.gateway_refund_id),
    taxablePaise:    num(head.taxable_paise),
    cgstPaise:       num(head.cgst_paise),
    sgstPaise:       num(head.sgst_paise),
    igstPaise:       num(head.igst_paise),
    totalPaise:      num(head.total_paise),
    lines:           lines.map(creditNoteLineFromRow).sort((a, b) => a.lineNo - b.lineNo),
  };
}

/** Intra-state when the note carries no IGST (a note follows its invoice's tax type). */
export function creditNoteIsIntraState(doc: Pick<CreditNoteDoc, 'igstPaise' | 'lines'>): boolean {
  return doc.igstPaise === 0 && doc.lines.every((l) => l.igstPaise === 0);
}

/** The lines add up to the header, component by component (print refuses otherwise). */
export function creditNoteReconciles(doc: CreditNoteDoc): boolean {
  const sum = (f: (l: CreditNoteLine) => number) => doc.lines.reduce((s, l) => s + f(l), 0);
  return doc.lines.length > 0
    && doc.lines.every((l) => l.taxablePaise + l.cgstPaise + l.sgstPaise + l.igstPaise === l.totalPaise)
    && sum((l) => l.taxablePaise) === doc.taxablePaise
    && sum((l) => l.cgstPaise) === doc.cgstPaise
    && sum((l) => l.sgstPaise) === doc.sgstPaise
    && sum((l) => l.igstPaise) === doc.igstPaise
    && sum((l) => l.totalPaise) === doc.totalPaise;
}
