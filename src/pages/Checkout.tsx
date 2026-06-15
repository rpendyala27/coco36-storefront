import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Truck, Check, ArrowLeft, IndianRupee, Wallet, ShieldCheck, RotateCcw } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/currency';
import { API_URL, RAZORPAY_KEY_ID, supabase } from '../lib/supabase';
import { readPincode } from '../components/PincodePopup';
import { shippingFor, freeShippingRemaining } from '../lib/shipping';
import { useStoreConfig } from '../lib/storeConfig';

const DRAFT_KEY = 'coco36.checkout-draft';

declare global {
  interface Window {
    Razorpay: any;
  }
}

type PaymentMethod = 'prepaid' | 'cod';

interface SavedAddress {
  id: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  created_at: string;
}

export const Checkout = () => {
  const { items, clear } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const cfg = useStoreConfig();

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
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // ── Form state ──────────────────────────────────────────────────────────────
  // Restore from sessionStorage so a refresh/back-button doesn't lose input.
  const [form, setForm] = useState(() => {
    const empty = {
      name:    profile?.name ?? '',
      email:   profile?.email ?? user?.email ?? '',
      phone:   profile?.phone ?? '',
      line1:   '',
      line2:   '',
      city:    '',
      state:   '',
      pincode: readPincode() ?? '',
      paymentMethod: 'prepaid' as PaymentMethod,
    };
    if (typeof window === 'undefined') return empty;
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return empty;
      const draft = JSON.parse(raw);
      return { ...empty, ...draft };
    } catch { return empty; }
  });

  // Prefill once auth loads (only fills empties — preserves user edits)
  useEffect(() => {
    setForm((f) => ({
      ...f,
      name:  f.name  || profile?.name  || '',
      email: f.email || profile?.email || user?.email || '',
      phone: f.phone || profile?.phone || '',
    }));
  }, [user, profile]);

  // ── Login required ──────────────────────────────────────────────────────────
  // Checkout is gated so orders attach to the customer profile and the saved
  // address book works. AuthProvider only renders children once auth resolves,
  // so `user` is final here — no loading race.
  useEffect(() => {
    if (!user) navigate('/auth?redirect=/checkout', { replace: true });
  }, [user, navigate]);

  // ── Saved address book ───────────────────────────────────────────────────────
  // RLS returns only this customer's addresses (customer_id = auth.uid()).
  // Orders save shipping+billing rows every time, so we dedupe by content and
  // keep the most recent few.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('addresses')
        .select('id, name, line1, line2, city, state, pincode, created_at')
        .order('created_at', { ascending: false });
      if (!active || !data) return;
      const seen = new Set<string>();
      const unique: SavedAddress[] = [];
      for (const a of data as SavedAddress[]) {
        const key = `${a.line1}|${a.line2 ?? ''}|${a.city}|${a.state}|${a.pincode}`.toLowerCase().trim();
        if (seen.has(key) || !a.line1) continue;
        seen.add(key);
        unique.push(a);
      }
      setSavedAddresses(unique.slice(0, 6));
    })();
    return () => { active = false; };
  }, [user]);

  const applyAddress = (a: SavedAddress) => {
    setSelectedAddressId(a.id);
    setForm((f) => ({
      ...f,
      name:    f.name || a.name,
      line1:   a.line1,
      line2:   a.line2 ?? '',
      city:    a.city,
      state:   a.state,
      pincode: a.pincode,
    }));
  };

  const useNewAddress = () => {
    setSelectedAddressId(null);
    setForm((f) => ({ ...f, line1: '', line2: '', city: '', state: '', pincode: readPincode() ?? '' }));
  };

  // Persist the draft on every change. sessionStorage — not localStorage —
  // so it lives for the tab session but doesn't outlive a browser restart.
  useEffect(() => {
    try { window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* quota */ }
  }, [form]);

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
    const shipping_paise = shippingFor(subtotal_paise, cfg);
    const cod_paise      = form.paymentMethod === 'cod' ? cfg.codSurchargePaise : 0;
    return {
      subtotal_paise,
      shipping_paise,
      cod_paise,
      total_paise: subtotal_paise + shipping_paise + cod_paise,
    };
  }, [items, form.paymentMethod, cfg]);

  // Pincode → auto-fill city/state (cuts two fields → less decision fatigue).
  const lookupPincode = async (pin: string) => {
    if (!/^\d{6}$/.test(pin)) return;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const po = data?.[0]?.PostOffice?.[0];
      if (po) setForm((f) => ({ ...f, city: f.city || po.District, state: f.state || po.State }));
    } catch { /* offline / API down — user types manually */ }
  };

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
        try { window.sessionStorage.removeItem(DRAFT_KEY); } catch {}
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
        theme:    { color: '#15715f' },
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

  // While redirecting unauthenticated users to /auth, render nothing.
  if (!user) return null;

  // ── Empty cart guard ────────────────────────────────────────────────────────
  if (items.length === 0 && step !== 'confirmed') {
    return (
      <div className="min-h-screen pt-32 px-6 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl mb-6">Your cart is empty.</h1>
        <Link to="/shop" className="btn-primary !px-8 !py-4">
          Browse the shop
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
          <Link to="/shop" className="btn-primary !px-8 !py-4">
            Continue shopping
          </Link>
          <button onClick={() => navigate('/')} className="btn-ghost !px-8 !py-4">
            Back to home
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

        <header className="mb-8 border-b border-brand-line pb-8">
          <span className="eyebrow text-brand-primary mb-3 block">Secure Checkout</span>
          <h1 className="text-5xl md:text-6xl">Place your order.</h1>
          {/* Endowed progress — the cart step is already done, so this feels almost finished */}
          <div className="flex items-center gap-3 mt-6 max-w-md">
            {['Cart', 'Details', 'Payment'].map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <span className={`size-6 rounded-full flex items-center justify-center text-[11px] font-bold ${i === 0 ? 'bg-brand-primary text-white' : i === 1 ? 'bg-brand-deep text-white' : 'bg-brand-band text-brand-muted'}`}>
                    {i === 0 ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`text-[12px] font-medium ${i < 2 ? 'text-brand-deep' : 'text-brand-muted'}`}>{s}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-px ${i === 0 ? 'bg-brand-deep' : 'bg-brand-line'}`} />}
              </React.Fragment>
            ))}
          </div>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Forms */}
          <div className="lg:col-span-7 space-y-12">
            {/* Contact */}
            <section>
              <h2 className="text-2xl mb-2 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-deep text-white text-xs flex items-center justify-center font-sans not-italic">1</span>
                Contact
              </h2>
              <p className="text-sm text-brand-muted mb-5 ml-10">
                Signed in as <span className="font-medium text-brand-deep">{form.email}</span>.
              </p>
              <div className="grid grid-cols-1 gap-5 mt-4">
                <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required autoComplete="name" />
                <Field label="Email" type="email" value={form.email} onChange={() => {}} required readOnly autoComplete="email" />
                <Field label="Phone" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required placeholder="+91 …" autoComplete="tel" />
              </div>
            </section>

            {/* Shipping */}
            <section>
              <h2 className="text-2xl mb-6 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-deep text-white text-xs flex items-center justify-center font-sans not-italic">2</span>
                <Truck size={18} strokeWidth={1.5} className="text-brand-muted" />
                Shipping Address
              </h2>

              {savedAddresses.length > 0 && (
                <div className="mb-6">
                  <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 mb-3">Use a saved address</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {savedAddresses.map((a) => (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => applyAddress(a)}
                        className={`text-left border p-3.5 rounded-lg transition-colors ${selectedAddressId === a.id ? 'border-brand-primary bg-brand-primary/5' : 'border-brand-line hover:border-brand-deep'}`}
                      >
                        <p className="text-sm text-brand-deep leading-snug">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
                        <p className="text-xs text-brand-muted mt-0.5">{a.city}, {a.state} {a.pincode}</p>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={useNewAddress}
                      className={`text-left border border-dashed p-3.5 rounded-lg text-sm font-medium transition-colors ${selectedAddressId === null ? 'border-brand-deep text-brand-deep' : 'border-brand-line text-brand-muted hover:border-brand-deep hover:text-brand-deep'}`}
                    >
                      + Use a new address
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5">
                <Field label="Pincode" value={form.pincode} onChange={(v) => { setForm({ ...form, pincode: v }); lookupPincode(v); }} required autoComplete="postal-code" placeholder="6-digit PIN — city & state auto-fill" />
                <Field label="Address Line 1" value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} required autoComplete="address-line1" />
                <Field label="Address Line 2 (optional)" value={form.line2} onChange={(v) => setForm({ ...form, line2: v })} autoComplete="address-line2" />
                <div className="grid grid-cols-2 gap-5">
                  <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required autoComplete="address-level2" />
                  <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} required autoComplete="address-level1" />
                </div>
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
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand-ink text-brand-paper text-[10px] font-bold flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif italic text-base leading-tight">{item.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-brand-muted font-bold">{item.sizeLabel}</p>
                    </div>
                    <span className="font-bold text-base shrink-0 text-brand-ink">
                      {formatMoney(item.unitPriceInPaise * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3 pt-6 border-t border-brand-line text-sm">
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
                {totals.cod_paise > 0 && (
                  <div className="flex justify-between">
                    <span className="text-brand-muted">COD handling</span>
                    <span className="font-semibold">{formatMoney(totals.cod_paise)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t border-brand-line items-baseline">
                  <span className="text-[11px] uppercase tracking-widest font-bold">Total · incl. taxes</span>
                  <span className="font-serif text-3xl text-brand-deep">{formatMoney(totals.total_paise)}</span>
                </div>
              </div>

              {freeShippingRemaining(totals.subtotal_paise, cfg) > 0 && (
                <p className="text-[12px] text-brand-muted text-center bg-brand-paper py-3 border border-brand-line rounded">
                  Add <span className="text-brand-deep font-bold">{formatMoney(freeShippingRemaining(totals.subtotal_paise, cfg))}</span> more for free shipping
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
                className="btn-primary w-full !py-5 disabled:opacity-50"
              >
                <Lock size={14} /> {submitting ? 'Processing…' : `Place order — ${formatMoney(totals.total_paise)}`}
              </button>

              {/* Trust cluster — reduces amygdala-driven suspicion at the decision point */}
              <div className="flex items-center justify-center gap-4 text-[10px] uppercase tracking-wide text-brand-muted font-medium">
                <span className="inline-flex items-center gap-1"><Lock size={11} /> Secure</span>
                <span className="inline-flex items-center gap-1"><RotateCcw size={11} /> 7-day returns</span>
                <span className="inline-flex items-center gap-1"><ShieldCheck size={11} /> FSSAI licensed</span>
              </div>

              <p className="text-[11px] text-brand-muted text-center opacity-70">
                By placing this order you agree to our{' '}
                <Link to="/terms" className="underline hover:text-brand-deep">terms</Link>.
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
  autoComplete?: string;
  readOnly?: boolean;
}
function Field({ label, value, onChange, type = 'text', required, placeholder, autoComplete, readOnly }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        readOnly={readOnly}
        className={`w-full bg-transparent border-b border-brand-line py-3 focus:outline-none focus:border-brand-primary text-lg placeholder:text-brand-muted/50 placeholder:not-italic ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
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
