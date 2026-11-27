import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AuthPending, useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { loadInvoiceSettings, sellerHeaderReady } from '../lib/invoiceHeader';
import { loadOwnCreditNote, orderBillGstin, showCreditNotes } from '../lib/creditNotes';
import { creditNoteReconciles, type CreditNoteDoc } from '../lib/credit-note-types';
import { InvoicePrintButton, SellerDetailsUnavailable } from '../components/InvoiceTemplate';
import { CreditNoteTemplate } from '../components/CreditNoteTemplate';
import type { InvoiceSettings } from '../lib/invoice-types';

type Party = { name?: string | null; email?: string | null; phone?: string | null; gstin?: string | null };
type Addr = { gstin?: string | null; name?: string | null; line1?: string | null; line2?: string | null; city?: string | null; state?: string | null; pincode?: string | null };

/**
 * /account/orders/:id/credit-notes/:cnId — the shopper's printable GST credit
 * note (P25). Read with the shopper's own session; RLS returns only credit
 * notes on their own orders. Seller block from customer_invoice_header(), as
 * on the invoice; without it the note is not rendered.
 */
export const AccountCreditNote = () => {
  const { id, cnId } = useParams<{ id: string; cnId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<CreditNoteDoc | null>(null);
  const [party, setParty] = useState<{ customer: Party; addr: Addr; ship: Addr; codes: { seller: string | null; buyer: string | null } } | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/account/orders/${id}/credit-notes/${cnId}`)}`);
      return;
    }
    if (!id || !cnId) return;
    (async () => {
      const [note, orderRes, chrome] = await Promise.all([
        loadOwnCreditNote(supabase, id, cnId),
        supabase
          .from('orders')
          .select(`id,
            customer:customers(name, email, phone, gstin),
            bill:addresses!bill_address_id(name, line1, line2, city, state, pincode, gstin),
            ship:addresses!ship_address_id(name, line1, line2, city, state, pincode),
            invoice:invoices(gst_breakup)`)
          .eq('id', id)
          .eq('customer_id', user.id)
          .maybeSingle(),
        loadInvoiceSettings().catch(() => ({ seller: null, storeName: 'COCO36' })),
      ]);
      type Breakup = { sellerStateCode?: string; buyerStateCode?: string };
      const row = (orderRes.data ?? null) as { customer?: Party | Party[]; bill?: Addr | Addr[]; ship?: Addr | Addr[]; invoice?: { gst_breakup?: Breakup } | { gst_breakup?: Breakup }[] } | null;
      // Business orders only (billing address carried a GSTIN); others ask support.
      const gstin = orderBillGstin(row);
      if (!showCreditNotes(gstin)) {
        setDoc(null);
        setParty(null);
        setSettings(chrome);
        setLoading(false);
        return;
      }
      const one = <T,>(v: T | T[] | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
      const bill = one(row?.bill);
      setDoc(note);
      const ship = one(row?.ship) ?? {};
      const breakup = one(row?.invoice)?.gst_breakup;
      // State codes as on the original invoice (place of supply = buyer); seller falls back to the GSTIN prefix.
      const sellerGstin = chrome.seller?.gstin ?? '';
      const codes = {
        seller: breakup?.sellerStateCode ?? (/^[0-9]{2}/.test(sellerGstin) ? sellerGstin.slice(0, 2) : null),
        buyer:  breakup?.buyerStateCode ?? null,
      };
      setParty(row ? { customer: { ...(one(row.customer) ?? {}), gstin }, addr: (bill && bill.line1 ? bill : ship), ship, codes } : null);
      setSettings(chrome);
      setLoading(false);
    })().catch(() => setLoading(false));
  }, [authLoading, id, cnId, user, navigate]);

  if (authLoading) return <AuthPending />;
  if (!user) return null;
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-paper">
        <p className="text-sm text-brand-muted">Loading credit note…</p>
      </div>
    );
  }
  if (!doc || !party || !settings || !creditNoteReconciles(doc)) {
    return (
      <div className="min-h-screen pt-24 px-6 max-w-2xl mx-auto text-center">
        <p className="text-sm text-brand-ink bg-brand-surface border border-brand-ink/10 px-4 py-3 mb-6">
          Credit note not available here. For a copy, contact support with your order number.
        </p>
        <Link to={id ? `/account/orders/${id}` : '/account'} className="text-sm font-bold text-brand-leaf hover:underline">
          ← Back to order
        </Link>
      </div>
    );
  }

  const canPrint = sellerHeaderReady(settings.seller);
  const c = party.customer;
  const a = party.addr;
  return (
    <>
      <div className="print:hidden bg-brand-paper border-b border-brand-ink/10 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link to={`/account/orders/${id}`} className="flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink transition-colors">
          <ArrowLeft size={14} /> Back to order
        </Link>
        {canPrint ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-brand-muted">
              Credit note <span className="font-mono font-bold text-brand-ink">{doc.number}</span>
            </span>
            <InvoicePrintButton />
          </div>
        ) : null}
      </div>
      {canPrint && settings.seller ? (
        <CreditNoteTemplate
          doc={doc}
          seller={settings.seller}
          customer={{
            name: c.name ?? a.name ?? '', email: c.email ?? '', phone: c.phone ?? '', gstin: c.gstin ?? null,
            line1: a.line1 ?? '', line2: a.line2 ?? '', city: a.city ?? '', state: a.state ?? '', pincode: a.pincode ?? '',
          }}
          ship={{
            name: party.ship.name ?? '', line1: party.ship.line1 ?? '', line2: party.ship.line2 ?? '',
            city: party.ship.city ?? '', state: party.ship.state ?? '', pincode: party.ship.pincode ?? '',
          }}
          codes={party.codes}
        />
      ) : (
        <SellerDetailsUnavailable onRetry={() => window.location.reload()} />
      )}
    </>
  );
};
