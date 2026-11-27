import {
  CREDIT_NOTE_COLUMNS,
  CREDIT_NOTE_LINE_COLUMNS,
  creditNoteFromRows,
  type CreditNoteDoc,
} from './credit-note-types';

/**
 * P25 · the shopper's own GST credit notes. Reads go through the shopper's
 * session (anon key + RLS: customers_read_own_credit_notes / _lines), never
 * the service key. A failed read (the admin migration not applied yet, a
 * network error) shows no credit note rather than an error.
 */

type Query = PromiseLike<{ data: unknown; error: unknown }> & {
  select: (cols: string) => Query;
  eq: (col: string, value: string) => Query;
  order: (col: string, opts?: { ascending?: boolean }) => Query;
  maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }>;
};
export type CreditNoteClient = { from: (table: string) => unknown };

const q = (client: CreditNoteClient, table: string) => client.from(table) as Query;

/**
 * Credit notes are shown only to business buyers: the order's billing address
 * carried a GSTIN (Rohan, 27 Nov). Retail buyers see their refund status and
 * can ask support for a copy. Known gap: the GSTIN is read from the saved
 * billing address, not frozen on the invoice; post-launch the invoice
 * snapshots the buyer GSTIN and this check moves to that value.
 */
export function showCreditNotes(billGstin: unknown): boolean {
  return typeof billGstin === 'string' && /^[0-9]{2}[A-Z0-9]{13}$/.test(billGstin.trim().toUpperCase());
}

/** The order's billing-address GSTIN from an orders row with `bill:addresses!bill_address_id(gstin)`. */
export function orderBillGstin(row: { bill?: unknown } | null | undefined): string | null {
  const bill = Array.isArray(row?.bill) ? row?.bill[0] : row?.bill;
  const g = (bill as { gstin?: unknown } | null | undefined)?.gstin;
  return typeof g === 'string' && g.trim() ? g.trim() : null;
}

export type OwnCreditNote = { id: string; number: string; issuedAt: string; totalPaise: number; cancelled: boolean };

export async function loadOwnCreditNotes(client: CreditNoteClient, orderId: string): Promise<OwnCreditNote[]> {
  try {
    const { data, error } = await q(client, 'credit_notes')
      .select('id, credit_note_number, issued_at, total_paise, status')
      .eq('order_id', orderId)
      .order('issued_at', { ascending: true });
    if (error || !Array.isArray(data)) return [];
    return (data as Record<string, unknown>[]).map((r) => ({
      id:         String(r.id),
      number:     String(r.credit_note_number ?? ''),
      issuedAt:   String(r.issued_at ?? ''),
      totalPaise: Number(r.total_paise ?? 0),
      cancelled:  r.status === 'cancelled',
    }));
  } catch {
    return [];
  }
}

/** One credit note with its lines, only if it belongs to this order (RLS also checks the owner). */
export async function loadOwnCreditNote(client: CreditNoteClient, orderId: string, id: string): Promise<CreditNoteDoc | null> {
  try {
    const [head, lines] = await Promise.all([
      q(client, 'credit_notes').select(CREDIT_NOTE_COLUMNS).eq('id', id).eq('order_id', orderId).maybeSingle(),
      q(client, 'credit_note_lines').select(CREDIT_NOTE_LINE_COLUMNS).eq('credit_note_id', id).order('line_no'),
    ]);
    if (head.error || !head.data || lines.error || !Array.isArray(lines.data)) return null;
    return creditNoteFromRows(head.data as Record<string, unknown>, lines.data as Record<string, unknown>[]);
  } catch {
    return null;
  }
}
