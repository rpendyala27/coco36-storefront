import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Truck, MapPin, CreditCard, RotateCcw, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, API_URL } from '../lib/supabase';
import { formatMoney } from '../lib/currency';

interface OrderDetail {
  id:             string;
  order_number:   string;
  status:         string;
  payment_method: string;
  subtotal_paise: number;
  shipping_paise: number;
  total_paise:    number;
  placed_at:      string;
  items: {
    qty:                number;
    unit_price_paise:   number;
    variant:            { size_label: string; product: { name: string; brand: string } };
  }[];
  shipping: { name: string; line1: string; line2: string | null; city: string; state: string; pincode: string } | null;
  shipment: { awb: string | null; courier: string | null; status: string } | null;
}

/** /account/orders/:id — full order detail, gated on the order being the
 *  caller's own (enforced by RLS via auth.uid() = customer_id). */
export const AccountOrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Return-request UI state
  const [returnFormOpen, setReturnFormOpen] = useState(false);
  const [returnReason, setReturnReason]   = useState('damaged');
  const [returnNote, setReturnNote]       = useState('');
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnSubmitted,  setReturnSubmitted]  = useState(false);
  const [returnError, setReturnError]     = useState<string | null>(null);

  async function submitReturn() {
    if (!order || !user) return;
    setReturnSubmitting(true);
    setReturnError(null);
    try {
      const res = await fetch(`${API_URL}/api/returns/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId:      order.id,
          customerId:   user.id,
          reasonCode:   returnReason,
          customerNote: returnNote || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not submit return');
      setReturnSubmitted(true);
    } catch (err: any) {
      setReturnError(err.message);
    } finally {
      setReturnSubmitting(false);
    }
  }

  useEffect(() => {
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent('/account/orders/' + id)}`);
      return;
    }
    if (!id) return;

    (async () => {
      const { data, error: err } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, payment_method,
          subtotal_paise, shipping_paise, total_paise, placed_at,
          items:order_items (
            qty, unit_price_paise,
            variant:product_variants ( size_label,
              product:products ( name, brand )
            )
          ),
          shipping:addresses!ship_address_id ( name, line1, line2, city, state, pincode ),
          shipment:shipments ( awb, courier, status )
        `)
        .eq('id', id)
        .eq('customer_id', user.id)
        .maybeSingle();

      if (err || !data) {
        setError(err?.message ?? 'Order not found.');
      } else {
        setOrder({
          ...(data as any),
          shipment: Array.isArray((data as any).shipment) ? (data as any).shipment[0] ?? null : (data as any).shipment ?? null,
        });
      }
      setLoading(false);
    })();
  }, [id, user, navigate]);

  if (!user) return null;

  return (
    <div className="bg-brand-paper min-h-screen pt-20 md:pt-24">
      <div className="max-w-4xl mx-auto px-6 md:px-10 lg:px-16 py-12 space-y-8">

        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-muted hover:text-brand-ink transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Account
        </Link>

        {loading && <p className="text-sm text-brand-muted">Loading order…</p>}
        {error && (
          <div className="bg-red-50 border border-red-200 p-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {order && (
          <>
            {/* ── Header ─────────────────────────────────────────────────── */}
            <header className="border-b border-brand-ink/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-brand-leaf font-bold mb-2">
                  Order {order.order_number}
                </p>
                <h1 className="text-3xl md:text-4xl">
                  {order.status === 'delivered' ? 'Delivered.' :
                   order.status === 'shipped'   ? 'On its way.' :
                   order.status === 'cancelled' ? 'Cancelled.' :
                   'We’re preparing your order.'}
                </h1>
                <p className="text-sm text-brand-muted mt-2">
                  Placed {new Date(order.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </header>

            {/* ── Status + Tracking ──────────────────────────────────────── */}
            {(order.status === 'shipped' || order.status === 'delivered') && order.shipment?.awb && (
              <section className="bg-brand-surface border border-brand-ink/10 p-6">
                <div className="flex items-start gap-4">
                  <Truck size={20} strokeWidth={1.5} className="text-brand-leaf mt-1" />
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-brand-ink mb-1">
                      {order.shipment.courier ?? 'Courier'} · AWB {order.shipment.awb}
                    </p>
                    <p className="text-sm text-brand-muted mb-3">
                      Track your shipment in real time.
                    </p>
                    <Link
                      to={`/track/${order.shipment.awb}`}
                      className="text-[10px] uppercase tracking-widest font-bold text-brand-leaf hover:underline"
                    >
                      Track shipment →
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* ── Invoice link (status ≥ packed) ──────────────────────────── */}
            {['packed', 'shipped', 'delivered'].includes(order.status) && (
              <Link
                to={`/account/orders/${order.id}/invoice`}
                className="block bg-brand-ink text-white p-6 hover:bg-brand-ink/90 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <FileText size={20} strokeWidth={1.5} className="text-brand-gold mt-1" />
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/60 mb-1">Tax Invoice</p>
                    <p className="text-sm font-bold flex items-center justify-between">
                      View &amp; download invoice
                      <span className="text-brand-gold group-hover:translate-x-1 transition-transform">→</span>
                    </p>
                  </div>
                </div>
              </Link>
            )}

            {/* ── Items ───────────────────────────────────────────────────── */}
            <section>
              <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-brand-ink mb-4">
                <Package size={14} className="text-brand-leaf" /> Items
              </h2>
              <div className="bg-white border border-brand-ink/10 divide-y divide-brand-ink/5">
                {order.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-brand-ink">{it.variant?.product?.name}</p>
                      <p className="text-xs text-brand-muted">
                        {it.variant?.product?.brand} · {it.variant?.size_label} · qty {it.qty}
                      </p>
                    </div>
                    <span className="font-bold text-brand-ink whitespace-nowrap">
                      {formatMoney(it.unit_price_paise * it.qty)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Totals ─────────────────────────────────────────────────── */}
            <section className="bg-white border border-brand-ink/10 p-6 space-y-3">
              <Row label="Subtotal" value={formatMoney(order.subtotal_paise)} />
              <Row label="Shipping" value={order.shipping_paise === 0 ? 'Free' : formatMoney(order.shipping_paise)} />
              <div className="border-t border-brand-ink/10 pt-3 flex justify-between items-baseline">
                <span className="text-[11px] uppercase tracking-widest font-bold">Total</span>
                <span className="text-2xl font-bold text-brand-ink">{formatMoney(order.total_paise)}</span>
              </div>
            </section>

            {/* ── Shipping address ───────────────────────────────────────── */}
            {order.shipping && (
              <section>
                <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-brand-ink mb-4">
                  <MapPin size={14} className="text-brand-leaf" /> Delivering to
                </h2>
                <div className="bg-white border border-brand-ink/10 p-6">
                  <p className="font-bold text-brand-ink mb-1">{order.shipping.name}</p>
                  <p className="text-sm text-brand-muted leading-relaxed">
                    {order.shipping.line1}
                    {order.shipping.line2 && <>, {order.shipping.line2}</>}<br />
                    {order.shipping.city}, {order.shipping.state} {order.shipping.pincode}
                  </p>
                </div>
              </section>
            )}

            {/* ── Payment ────────────────────────────────────────────────── */}
            <section>
              <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-brand-ink mb-4">
                <CreditCard size={14} className="text-brand-leaf" /> Payment
              </h2>
              <div className="bg-white border border-brand-ink/10 p-6">
                <p className="text-sm text-brand-ink">
                  {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online · Razorpay'}
                </p>
              </div>
            </section>

            {/* ── Request Return (delivered orders only) ───────────────── */}
            {order.status === 'delivered' && (
              <section>
                <h2 className="flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold text-brand-ink mb-4">
                  <RotateCcw size={14} className="text-brand-leaf" /> Return this order
                </h2>
                <div className="bg-white border border-brand-ink/10 p-6">
                  {returnSubmitted ? (
                    <div>
                      <p className="text-sm font-bold text-green-700 mb-1">Return request submitted.</p>
                      <p className="text-xs text-brand-muted">
                        Our team will review and reach out via email within 24 hours.
                      </p>
                    </div>
                  ) : !returnFormOpen ? (
                    <div>
                      <p className="text-sm text-brand-muted mb-4">
                        Not satisfied? Request a return within your eligibility window.
                      </p>
                      <button
                        onClick={() => setReturnFormOpen(true)}
                        className="px-5 py-3 border border-brand-ink/20 text-[10px] uppercase tracking-widest font-bold hover:bg-brand-ink hover:text-brand-paper transition-all"
                      >
                        Request Return
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-2">
                          Reason
                        </label>
                        <select
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          className="w-full border border-brand-ink/20 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-brand-leaf"
                        >
                          <option value="damaged">Damaged in transit</option>
                          <option value="wrong_item">Wrong item received</option>
                          <option value="quality">Quality issue</option>
                          <option value="not_needed">No longer needed</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-brand-muted font-bold mb-2">
                          Note (optional)
                        </label>
                        <textarea
                          value={returnNote}
                          onChange={(e) => setReturnNote(e.target.value)}
                          rows={3}
                          placeholder="Tell us a bit more so we can help…"
                          className="w-full border border-brand-ink/20 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-brand-leaf"
                        />
                      </div>
                      {returnError && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">{returnError}</p>
                      )}
                      <div className="flex gap-3">
                        <button
                          onClick={submitReturn}
                          disabled={returnSubmitting}
                          className="px-5 py-3 bg-brand-leaf text-white text-[10px] uppercase tracking-widest font-bold hover:bg-brand-leaf/90 transition-colors disabled:opacity-50"
                        >
                          {returnSubmitting ? 'Submitting…' : 'Submit Request'}
                        </button>
                        <button
                          onClick={() => setReturnFormOpen(false)}
                          className="px-5 py-3 border border-brand-ink/20 text-[10px] uppercase tracking-widest font-bold hover:border-brand-ink transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-brand-muted">{label}</span>
      <span className="font-semibold text-brand-ink">{value}</span>
    </div>
  );
}
