import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { loadInvoiceSettings, sellerHeaderReady } from '../lib/invoiceHeader';
import { InvoicePrintButton, InvoiceTemplate, SellerDetailsUnavailable } from '../components/InvoiceTemplate';
import type { InvoiceBreakup, InvoiceSettings } from '../lib/invoice-types';
import { INVOICE_CANCELLED_NONE, INVOICE_CANCELLED_NOTE, INVOICE_NOT_YET } from '../content/accountCopy';

interface InvoiceRow {
  id:             string;
  invoice_number: string;
  issued_at:      string;
  gst_breakup:    InvoiceBreakup;
}

interface OrderRow {
  id:             string;
  order_number:   string;
  status:         string;
  payment_method: string;
  placed_at:      string;
  customer:       { name: string; email: string; phone: string | null; gstin: string | null } | null;
  ship:           { name: string; line1: string; line2: string | null; city: string; state: string; pincode: string } | null;
  invoice:        InvoiceRow[] | InvoiceRow | null;
}

/**
 * /account/orders/:id/invoice
 *
 * Customer's printable tax invoice. Gated by Supabase RLS — only the
 * order's owning customer can SELECT the invoice row.
 *
 * The seller block is public.customer_invoice_header() (legal name, address,
 * GSTIN, FSSAI once set). It is not read from settings. store.name is still
 * a public settings row. If the header call fails, returns null, or is
 * missing the legal name, an address, or the GSTIN, the tax invoice is not
 * rendered and Print stays hidden.
 *
 * Browser print (File → Print → Save as PDF) gives the customer a takeaway PDF.
 *
 * The invoice is issued when the order ships (P22a-1, invoice at AWB). Before
 * that, or for an order cancelled before it shipped, there is no invoice and
 * the page says so instead of a confusing 404. A cancelled order that does
 * have an invoice keeps it, with a note above it.
 */
export const AccountInvoice = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [order, setOrder]       = useState<OrderRow | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent('/account/orders/' + id + '/invoice')}`);
      return;
    }
    if (!id) return;

    (async () => {
      try {
        // Order + invoice (RLS gates the read to this customer's orders).
        // Seller header is a separate RPC and must not fail this read.
        const orderQuery = supabase
          .from('orders')
          .select(`
            id, order_number, status, payment_method, placed_at,
            customer:customers(name, email, phone, gstin),
            ship:addresses!ship_address_id(name, line1, line2, city, state, pincode),
            invoice:invoices(id, invoice_number, issued_at, gst_breakup)
          `)
          .eq('id', id)
          .eq('customer_id', user.id)
          .maybeSingle();

        const [orderRes, chrome] = await Promise.all([
          orderQuery,
          // A header failure must not fail the invoice. The loader already
          // returns a null seller; this catch covers an unexpected throw.
          loadInvoiceSettings().catch(() => ({ seller: null, storeName: 'COCO36' })),
        ]);

        if (orderRes.error || !orderRes.data) {
          setError('Order not found.');
          setLoading(false);
          return;
        }

        setOrder(orderRes.data as any);
        setSettings(chrome);
        setLoading(false);
      } catch {
        setError('Could not load invoice.');
        setLoading(false);
      }
    })();
  }, [id, user, navigate]);

  if (!user) return null;

  // ── Loading ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-paper">
        <p className="text-sm text-brand-muted">Loading invoice…</p>
      </div>
    );
  }

  // ── Error / no access ─────────────────────────────────────────────────
  if (error || !order || !settings) {
    return (
      <div className="min-h-screen pt-24 px-6 max-w-2xl mx-auto text-center">
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mb-6">
          {error ?? 'Could not load invoice.'}
        </p>
        <Link to="/account" className="text-[10px] uppercase tracking-widest font-bold text-brand-leaf hover:underline">
          ← Back to Account
        </Link>
      </div>
    );
  }

  const invoice = Array.isArray(order.invoice) ? order.invoice[0] ?? null : order.invoice;
  const canPrint = sellerHeaderReady(settings.seller);

  const cancelled = order.status === 'cancelled';

  // ── Invoice not issued (not shipped yet, or cancelled before it shipped) ─
  if (!invoice) {
    return (
      <div className="min-h-screen pt-24 px-6 max-w-2xl mx-auto text-center">
        <div className="bg-white border border-brand-ink/10 p-10">
          <h1 className="text-2xl font-bold text-brand-ink mb-3">
            {cancelled ? 'No invoice for this order' : 'Invoice not yet issued'}
          </h1>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            {cancelled ? INVOICE_CANCELLED_NONE : INVOICE_NOT_YET}
          </p>
          <Link
            to={`/account/orders/${order.id}`}
            className="text-[10px] uppercase tracking-widest font-bold text-brand-leaf hover:underline"
          >
            Back to Order →
          </Link>
        </div>
      </div>
    );
  }

  // ── Invoice ready ──────────────────────────────────────────────────────
  return (
    <>
      {/* Toolbar — hidden on print */}
      <div className="print:hidden bg-brand-paper border-b border-brand-ink/10 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link
          to={`/account/orders/${order.id}`}
          className="flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink transition-colors"
        >
          <ArrowLeft size={14} /> Back to order
        </Link>
        <div className="flex items-center gap-3">
          {canPrint ? (
            <>
              <span className="text-xs text-brand-muted">
                Invoice <span className="font-mono font-bold text-brand-ink">{invoice.invoice_number}</span>
              </span>
              <InvoicePrintButton />
            </>
          ) : null}
        </div>
      </div>

      {cancelled && (
        <p className="print:hidden max-w-4xl mx-auto mt-6 px-6 py-3 text-sm text-brand-ink bg-brand-surface border border-brand-ink/10" role="status">
          {INVOICE_CANCELLED_NOTE}
        </p>
      )}

      {canPrint ? (
        <InvoiceTemplate
          invoiceNumber={invoice.invoice_number}
          invoiceDate={new Date(invoice.issued_at)}
          orderNumber={order.order_number}
          orderDate={new Date(order.placed_at)}
          paymentMethod={order.payment_method}
          customer={{
            name:  order.customer?.name  ?? '',
            email: order.customer?.email ?? '',
            phone: order.customer?.phone ?? '',
            gstin: order.customer?.gstin ?? null,
          }}
          ship={{
            name:    order.ship?.name    ?? '',
            line1:   order.ship?.line1   ?? '',
            line2:   order.ship?.line2   ?? '',
            city:    order.ship?.city    ?? '',
            state:   order.ship?.state   ?? '',
            pincode: order.ship?.pincode ?? '',
          }}
          breakup={invoice.gst_breakup}
          settings={settings}
        />
      ) : (
        <SellerDetailsUnavailable onRetry={() => window.location.reload()} />
      )}
    </>
  );
};
