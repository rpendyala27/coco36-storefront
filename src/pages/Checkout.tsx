import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Truck, Check, ArrowLeft, IndianRupee, Wallet } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/currency';
import { API_URL, RAZORPAY_KEY_ID } from '../lib/supabase';

const FREE_SHIPPING_THRESHOLD_PAISE = 250000; // ₹2,500
const SHIPPING_PAISE = 9900;                  // ₹99

declare global {
  interface Window {
    Razorpay: any;
  }
}

type PaymentMethod = 'prepaid' | 'cod';

export const Checkout = () => {
  const { items, clear } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Detect legacy items (static-catalogue sizeIds aren't valid variant UUIDs).
  // We DO NOT auto-remove them — earlier we did and it caused phantom
  // "Your cart is empty" pages when items were added during the brief warm-
  // start before Supabase products loaded. Now we just count them and show
  // a banner so the user knows to re-add from the shop.
  const legacyItemCount = items.filter((it) => !isUuid(it.sizeId)).length;

  const [step, setStep] = useState<'details' | 'confirmed'>('details');
  const [confirmedOrder, setConfirmedOrder] = useState<{ orderNumber: string; total_paise: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name:    profile?.name ?? '',
    email:   profile?.email ?? user?.email ?? '',
    phone:   profile?.phone ?? '',
    line1:   '',
    line2:   '',
    city:    '',
    state:   '',
    pincode: '',
    paymentMethod: 'prepaid' as PaymentMethod,
  });

  // Prefill once auth loads
  useEffect(() => {
    setForm((f) => ({
      ...f,
      name:  f.name  || profile?.name  || '',
      email: f.email || profile?.email || user?.email || '',
      phone: f.phone || profile?.phone || '',
    }));
  }, [user, profile]);

  // ── Load Razorpay SDK ───────────────────────────────────────────────────────
  useEffect(() => {
    if (window.Razorpay) {
      setRazorpayLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src   = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload  = () => setRazorpayLoaded(true);
    script.onerror = () => setError('Could not load payment gateway. Please refresh.');
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  // ── Totals ──────────────────────────────────────────────────────────────────
  // Paise end-to-end — Supabase, cart, checkout, payment gateway all agree.
  const totals = useMemo(() => {
    const subtotal_paise = items.reduce((sum, it) => sum + it.unitPriceInPaise * it.quantity, 0);
    const shipping_paise = subtotal_paise >= FREE_SHIPPING_THRESHOLD_PAISE
      ? 0
      : (items.length > 0 ? SHIPPING_PAISE : 0);
    return {
      subtotal_paise,
      shipping_paise,
      total_paise: subtotal_paise + shipping_paise,
    };
  }, [items]);

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Server-side validation will reject non-UUID variant IDs with a 400.
    // We surface a clearer error to the user before submission so they
    // can fix it themselves rather than seeing a generic API error.
    const invalidItems = items.filter((it) => !isUuid(it.sizeId));
    if (invalidItems.length > 0) {
      setError(
        `${invalidItems.length} item${invalidItems.length === 1 ? '' : 's'} in your cart can't be checked out (${invalidItems.map((it) => it.name).join(', ')}). ` +
        `Please remove them from the cart drawer and re-add from the shop.`,
      );
      return;
    }

    if (form.paymentMethod === 'prepaid' && !razorpayLoaded) {
      setError('Payment gateway still loading. Please wait a moment.');
      return;
    }

    setSubmitting(true);

    try {
      const orderRes = await fetch(`${API_URL}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((it) => ({ variantId: it.sizeId, qty: it.quantity })),
          shippingAddress: {
            line1: form.line1, line2: form.line2 || undefined,
            city: form.city, state: form.state, pincode: form.pincode,
          },
          billingAddress: {
            line1: form.line1, line2: form.line2 || undefined,
            city: form.city, state: form.state, pincode: form.pincode,
          },
          customerName:  form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          paymentMethod: form.paymentMethod,
        }),
      });

      const payload = await orderRes.json();
      if (!orderRes.ok) throw new Error(payload.error ?? 'Order creation failed');

      const { orderId, orderNumber, razorpayOrderId, amount } = payload;

      if (form.paymentMethod === 'cod') {
        setConfirmedOrder({ orderNumber, total_paise: amount });
        setStep('confirmed');
        setTimeout(() => clear(), 300);
        return;
      }

      // Prepaid — open Razorpay checkout
      if (!razorpayOrderId) throw new Error('Payment gateway not initialised');

      const rzp = new window.Razorpay({
        key:      RAZORPAY_KEY_ID,
        amount,            // paise
        currency: 'INR',
        name:     'COCO36',
        description: `Order ${orderNumber}`,
        order_id: razorpayOrderId,
        prefill:  { name: form.name, email: form.email, contact: form.phone },
        notes:    { orderId, orderNumber },
        theme:    { color: '#E8445A' },
        handler:  () => {
          // Razorpay JS handler fires on successful authorisation.
          // The webhook on the server is the real source of truth — but for
          // the user we show confirmation immediately.
          setConfirmedOrder({ orderNumber, total_paise: amount });
          setStep('confirmed');
          setTimeout(() => clear(), 300);
        },
        modal: {
          ondismiss: () => setSubmitting(false),
        },
      });

      rzp.on('payment.failed', (resp: any) => {
        setError(resp?.error?.description ?? 'Payment failed. Please try again.');
        setSubmitting(false);
      });

      rzp.open();
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  // ── Empty cart guard ────────────────────────────────────────────────────────
  if (items.length === 0 && step !== 'confirmed') {
    return (
      <div className="min-h-screen pt-32 px-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl mb-6">Your cart is empty.</h1>
        <Link
          to="/shop"
          className="px-10 py-4 bg-brand-ink text-brand-paper text-[11px] uppercase tracking-widest font-bold hover:bg-brand-primary transition-all"
        >
          Browse the Shop
        </Link>
      </div>
    );
  }

  // ── Confirmation step ───────────────────────────────────────────────────────
  if (step === 'confirmed' && confirmedOrder) {
    return (
      <div className="min-h-screen pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center max-w-xl mx-auto">
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-10"
        >
          <Check size={36} strokeWidth={1.5} />
        </motion.div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-4">
          Order {confirmedOrder.orderNumber}
        </p>
        <h1 className="text-5xl mb-6">Order Confirmed.</h1>
        <p className="text-lg text-brand-muted font-serif italic mb-2 leading-relaxed">
          Thank you for your order — total {formatMoney(confirmedOrder.total_paise)}.
        </p>
        <p className="text-sm text-brand-muted mb-12">
          A confirmation email is on its way. You'll receive tracking details once your shipment leaves origin.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/shop"
            className="px-10 py-4 bg-brand-ink text-brand-paper text-[11px] uppercase tracking-widest font-bold hover:bg-brand-primary transition-all"
          >
            Continue Shopping
          </Link>
          <button
            onClick={() => navigate('/')}
            className="px-10 py-4 border border-brand-ink/20 text-[11px] uppercase tracking-widest font-bold hover:border-brand-ink transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ── Checkout form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pt-28 pb-20 px-6 md:px-10 lg:px-16 bg-brand-paper">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-brand-muted hover:text-brand-ink transition-colors mb-8 group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
          Continue Shopping
        </Link>

        <header className="mb-12 border-b border-brand-ink/10 pb-8">
          <span className="text-[10px] uppercase tracking-[0.3em] text-brand-primary font-bold mb-3 block">Secure Checkout</span>
          <h1 className="text-5xl md:text-6xl">Place Your Order.</h1>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Forms */}
          <div className="lg:col-span-7 space-y-12">
            {/* Contact */}
            <section>
              <h2 className="text-2xl mb-6 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-ink text-brand-paper text-xs flex items-center justify-center font-sans not-italic">1</span>
                Contact
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required col={2} />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
                <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required placeholder="+91 …" />
              </div>
            </section>

            {/* Shipping */}
            <section>
              <h2 className="text-2xl mb-6 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-ink text-brand-paper text-xs flex items-center justify-center font-sans not-italic">2</span>
                <Truck size={18} strokeWidth={1.5} className="text-brand-muted" />
                Shipping Address
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="Address Line 1" value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} required col={2} />
                <Field label="Address Line 2 (optional)" value={form.line2} onChange={(v) => setForm({ ...form, line2: v })} col={2} />
                <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
                <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} required />
                <Field label="Pincode" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} required col={2} />
              </div>
            </section>

            {/* Payment */}
            <section>
              <h2 className="text-2xl mb-6 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-ink text-brand-paper text-xs flex items-center justify-center font-sans not-italic">3</span>
                <Wallet size={18} strokeWidth={1.5} className="text-brand-muted" />
                Payment Method
              </h2>
              <div className="space-y-3">
                <PaymentOption
                  selected={form.paymentMethod === 'prepaid'}
                  onSelect={() => setForm({ ...form, paymentMethod: 'prepaid' })}
                  title="Online — UPI, Cards, Netbanking, Wallets"
                  hint="Powered by Razorpay · 256-bit TLS"
                  icon={<IndianRupee size={18} />}
                />
                <PaymentOption
                  selected={form.paymentMethod === 'cod'}
                  onSelect={() => setForm({ ...form, paymentMethod: 'cod' })}
                  title="Cash on Delivery"
                  hint="Pay in cash when your order arrives"
                  icon={<Truck size={18} />}
                />
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-brand-muted font-bold pt-2">
                  <Lock size={11} /> All payments encrypted via TLS 1.3
                </div>
              </div>
            </section>
          </div>

          {/* Order summary */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28 border border-brand-ink/10 bg-brand-surface p-8 space-y-6">
              <h2 className="text-2xl border-b border-brand-ink/10 pb-4">Order Summary</h2>

              <ul className="space-y-4 max-h-80 overflow-y-auto">
                {items.map((item) => (
                  <li key={`${item.productId}-${item.sizeId}`} className="flex gap-4">
                    <div className="relative w-16 h-20 shrink-0 bg-brand-paper overflow-hidden">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover grayscale" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-ink text-brand-paper text-[10px] font-bold flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif italic text-base leading-tight">{item.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">{item.sizeLabel}</p>
                    </div>
                    <span className="font-bold text-base shrink-0 text-brand-indigo">
                      {formatMoney(item.unitPriceInPaise * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3 pt-6 border-t border-brand-ink/10 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-muted">Subtotal</span>
                  <span className="font-semibold">{formatMoney(totals.subtotal_paise)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-brand-muted">Shipping</span>
                  <span className="font-semibold">
                    {totals.shipping_paise === 0
                      ? <span className="text-brand-primary text-[10px] uppercase tracking-widest font-bold">Free</span>
                      : formatMoney(totals.shipping_paise)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-brand-ink/10 items-baseline">
                  <span className="text-[11px] uppercase tracking-widest font-bold">Total</span>
                  <span className="text-3xl font-bold text-brand-indigo">{formatMoney(totals.total_paise)}</span>
                </div>
              </div>

              {totals.subtotal_paise < FREE_SHIPPING_THRESHOLD_PAISE && (
                <p className="text-[10px] uppercase tracking-widest text-brand-muted text-center bg-brand-paper py-3 border border-brand-ink/10">
                  Add <span className="text-brand-primary font-bold">{formatMoney(FREE_SHIPPING_THRESHOLD_PAISE - totals.subtotal_paise)}</span> more for free shipping
                </p>
              )}

              {legacyItemCount > 0 && !error && (
                <div className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 normal-case tracking-normal leading-snug">
                  <p className="uppercase tracking-widest mb-1">{legacyItemCount} item{legacyItemCount === 1 ? '' : 's'} need attention</p>
                  <p className="text-amber-700 font-normal">Some items were added before our latest catalogue update and can't be checked out as-is. Open the cart drawer, remove them, and re-add from the shop to continue.</p>
                </div>
              )}

              {error && (
                <div className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-4 py-3 normal-case tracking-normal leading-snug">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full !py-5 !text-[11px] disabled:opacity-50"
              >
                <Lock size={13} /> {submitting ? 'Processing…' : `Place Order — ${formatMoney(totals.total_paise)}`}
              </button>

              <p className="text-[10px] uppercase tracking-widest text-brand-muted text-center font-bold opacity-60">
                By placing this order you agree to our terms.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  col?: 1 | 2;
}
function Field({ label, value, onChange, type = 'text', required, placeholder, col = 1 }: FieldProps) {
  return (
    <div className={col === 2 ? 'sm:col-span-2 space-y-1' : 'space-y-1'}>
      <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-brand-ink/20 py-3 focus:outline-none focus:border-brand-primary text-lg font-serif italic"
      />
    </div>
  );
}

interface PaymentOptionProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
  icon: React.ReactNode;
}
function PaymentOption({ selected, onSelect, title, hint, icon }: PaymentOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-center gap-4 px-5 py-4 border-2 transition-all text-left ${
        selected
          ? 'border-brand-primary bg-brand-primary/5'
          : 'border-brand-ink/15 hover:border-brand-ink/40'
      }`}
    >
      <div className={`w-10 h-10 flex items-center justify-center ${selected ? 'text-brand-primary' : 'text-brand-muted'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[10px] uppercase tracking-widest text-brand-muted">{hint}</p>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 ${selected ? 'border-brand-primary bg-brand-primary' : 'border-brand-ink/30'}`} />
    </button>
  );
}

// UUID v4-ish format check — used to gate orders from being placed with
// static-fallback cart items (which have non-UUID size IDs).
function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
