import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import type { InvoiceBreakup, InvoiceSettings } from '../lib/invoice-types';

interface InvoiceRow {
  id:             string;
  invoice_number: string;
  issued_at:      string;
  gst_breakup:    InvoiceBreakup;
}

interface OrderRow {
  id:             string;
  order_number:   string;
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
 * Renders the same `InvoiceTemplate` the admin uses. Browser print
 * (File → Print → Save as PDF) gives the customer a takeaway PDF.
 *
 * If the order hasn't been packed yet there's no invoice — we show
 * a polite empty state instead of a confusing 404.
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
      // 1. Order + invoice (RLS gates the read to this customer's orders)
      const orderQuery = supabase
        .from('orders')
        .select(`
          id, order_number, payment_method, placed_at,
          customer:customers(name, email, phone, gstin),
          ship:addresses!ship_address_id(name, line1, line2, city, state, pincode),
          invoice:invoices(id, invoice_number, issued_at, gst_breakup)
        `)
        .eq('id', id)
        .eq('customer_id', user.id)
        .maybeSingle();

      // 2. Settings — public-readable (anon SELECT policy)
      const settingsQuery = supabase
        .from('settings')
        .select('key, value');

      const [orderRes, settingsRes] = await Promise.all([orderQuery, settingsQuery]);

      if (orderRes.error || !orderRes.data) {
        setError('Order not found.');
        setLoading(false);
        return;
      }

      setOrder(orderRes.data as any);

      // Project settings rows → InvoiceSettings shape
      const map = new Map<string, unknown>(
        (settingsRes.data ?? []).map((r: any) => [r.key, r.value]),
      );
      setSettings({
        storeName: pickStr(map.get('store.name'), 'COCO36'),
        seller: {
          legalName:    pickStr(map.get('seller.legal_name'),    'COCO36 Foods Pvt Ltd'),
          gstin:        pickStr(map.get('seller.gstin'),         ''),
          pan:          pickStr(map.get('seller.pan'),           ''),
          addressLine1: pickStr(map.get('seller.address_line1'), ''),
          addressLine2: pickStr(map.get('seller.address_line2'), ''),
          city:         pickStr(map.get('seller.city'),          ''),
          state:        pickStr(map.get('seller.state'),         ''),
          pincode:      pickStr(map.get('seller.pincode'),       ''),
          fssaiLicNo:   pickStr(map.get('seller.fssai_lic_no'),  ''),
        },
        invoice: {
          terms:        pickStr(map.get('invoice.terms'),         ''),
          bankName:     pickStr(map.get('invoice.bank_name'),     ''),
          bankAccount:  pickStr(map.get('invoice.bank_account'),  ''),
          bankIfsc:     pickStr(map.get('invoice.bank_ifsc'),     ''),
          signatureUrl: pickStr(map.get('invoice.signature_url'), ''),
          logoUrl:      pickStr(map.get('invoice.logo_url'),      ''),
        },
      });
      setLoading(false);
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

  // Normalize invoice → single object (Supabase returns array on 1:0..1 relations)
  const invoice = Array.isArray(order.invoice) ? order.invoice[0] ?? null : order.invoice;

  // ── Invoice not yet issued ─────────────────────────────────────────────
  if (!invoice) {
    return (
      <div className="min-h-screen pt-24 px-6 max-w-2xl mx-auto text-center">
        <div className="bg-white border border-brand-ink/10 p-10">
          <h1 className="text-2xl font-bold text-brand-ink mb-3">Invoice not yet issued</h1>
          <p className="text-sm text-brand-muted leading-relaxed mb-6">
            Your tax invoice will be available here once your order is packed.
            You'll also receive it by email at that point.
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
          <span className="text-xs text-brand-muted">
            Invoice <span className="font-mono font-bold text-brand-ink">{invoice.invoice_number}</span>
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-brand-leaf text-white text-[11px] uppercase tracking-widest font-bold hover:bg-brand-leaf/90 transition-colors"
          >
            <Printer size={13} /> Print / Save PDF
          </button>
        </div>
      </div>

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
    </>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function pickStr(v: unknown, fallback: string): string {
  return typeof v === 'string' ? v : fallback;
}
