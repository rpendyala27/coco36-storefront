import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Truck, Check, ArrowLeft, IndianRupee, Wallet, ShieldCheck, RotateCcw, Plus, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatMoney } from '../lib/currency';
import { API_URL, RAZORPAY_KEY_ID } from '../lib/supabase';
import { shippingFor, freeShippingRemaining } from '../lib/shipping';
import { useStoreConfig } from '../lib/storeConfig';
import { listAddresses, addAddress, type BookAddress, type AddressInput } from '../lib/addresses';
import { AddressForm } from '../components/AddressForm';

const DRAFT_KEY = 'coco36.checkout-draft';

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

  // ── Address book ──────────────────────────────────────────────────────────
  const [addresses, setAddresses]       = useState<BookAddress[]>([]);
  const [selectedShipId, setShipId]     = useState<string | null>(null);
  const [selectedBillId, setBillId]     = useState<string | null>(null);
  const [billSameAsShip, setBillSame]   = useState(true);
  const [addingShip, setAddingShip]     = useState(false);
  const [addingBill, setAddingBill]     = useState(false);
  const [busyAddr, setBusyAddr]         = useState(false);

  // ── Contact + payment form ────────────────────────────────────────────────
  // Address lives in the book now; this form only holds contact + payment.
  // Restored from sessionStorage so a refresh/back-button doesn't lose input.
  const [form, setForm] = useState(() => {
    const empty = {
      name:    profile?.name ?? '',
      email:   profile?.email ?? user?.email ?? '',
      phone:   profile?.phone ?? '',
      paymentMethod: 'prepaid' as PaymentMethod,
    };
    if (typeof window === 'undefined') return empty;
    try {
      const raw = window.sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return empty;
      return { ...empty, ...JSON.parse(raw) };
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

  // ── Load the address book ─────────────────────────────────────────────────
  // RLS returns only this customer's live rows. Preselect the default (or first)
  // for shipping; billing defaults to "same as shipping".
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const book = await listAddresses();
      if (!active) return;
      setAddresses(book);
      const preferred = book.find((a) => a.is_default)?.id ?? book[0]?.id ?? null;
      setShipId((prev) => prev ?? preferred);
    })();
    return () => { active = false; };
  }, [user]);

  // Persist contact + payment draft on every change.
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

  // ── Address-book helpers ────────────────────────────────────────────────────
  const addShipAddress = async (input: AddressInput) => {
    if (!user) return;
    setBusyAddr(true);
    const created = await addAddress(user.id, input);
    setAddresses(await listAddresses());
    if (created) setShipId(created.id);
    setBusyAddr(false);
    setAddingShip(false);
  };

  const addBillAddress = async (input: AddressInput) => {
    if (!user) return;
    setBusyAddr(true);
    const created = await addAddress(user.id, input);
    setAddresses(await listAddresses());
    if (created) setBillId(created.id);
    setBusyAddr(false);
    setAddingBill(false);
  };

  // ── Submit handler ──────────────────────────────────────────────────────────
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    // Contact is required (the page is no longer a <form>, so we check here —
    // see the <div> wrapper note below).
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Please enter your name and phone number.');
      return;
    }

    // Server-side validation will reject non-UUID variant IDs with a 400.
    // We surface a clearer error to the user before submission.
    const invalidItems = items.filter((it) => !isUuid(it.sizeId));
    if (invalidItems.length > 0) {
      setError(
        `${invalidItems.length} item${invalidItems.length === 1 ? '' : 's'} in your cart can't be checked out (${invalidItems.map((it) => it.name).join(', ')}). ` +
        `Please remove them from the cart drawer and re-add from the shop.`,
      );
      return;
    }

    if (!selectedShipId) {
      setError('Please select or add a shipping address.');
      return;
    }
    const billAddressId = billSameAsShip ? selectedShipId : selectedBillId;
    if (!billAddressId) {
      setError('Please select or add a billing address (or tick "same as shipping").');
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
          // Pin the order to the auth user so /account history + the address
          // book (both keyed on auth.uid()) resolve. Checkout is login-gated.
          customerId: user?.id,
          items: items.map((it) => ({ variantId: it.sizeId, qty: it.quantity })),
          // Reusable book rows — no per-order duplication. "Same as shipping"
          // points both at the one row. GSTIN rides on the billing address.
          shipAddressId: selectedShipId,
          billAddressId,
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
        theme:    { color: '#4e7d24' },
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
          className="w-20 h-20 rounded-full bg-brand-leaf/10 text-brand-leaf flex items-center justify-center mb-10"
        >
          <Check size={36} strokeWidth={1.5} />
        </motion.div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-brand-leaf font-bold mb-4">
          Order {confirmedOrder.orderNumber}
        </p>
        <h1 className="text-5xl mb-6">Order Confirmed.</h1>
        <p className="text-lg text-brand-muted font-display italic mb-2 leading-relaxed">
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

  const defaultName = form.name || profile?.name || '';

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
          <span className="eyebrow text-brand-leaf mb-3 block">Secure Checkout</span>
          <h1 className="text-5xl md:text-6xl">Place your order.</h1>
          {/* Endowed progress — the cart step is already done, so this feels almost finished */}
          <div className="flex items-center gap-3 mt-6 max-w-md">
            {['Cart', 'Details', 'Payment'].map((s, i) => (
              <React.Fragment key={s}>
                <div className="flex items-center gap-2">
                  <span className={`size-6 rounded-full flex items-center justify-center text-[11px] font-bold ${i === 0 ? 'bg-brand-leaf text-white' : i === 1 ? 'bg-brand-forest text-white' : 'bg-brand-band text-brand-muted'}`}>
                    {i === 0 ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`text-[12px] font-medium ${i < 2 ? 'text-brand-forest' : 'text-brand-muted'}`}>{s}</span>
                </div>
                {i < 2 && <div className={`flex-1 h-px ${i === 0 ? 'bg-brand-forest' : 'bg-brand-line'}`} />}
              </React.Fragment>
            ))}
          </div>
        </header>

        {/* Not a <form>: the inline AddressForm renders its own <form>, and
            nesting forms is invalid HTML. The place-order button submits via
            onClick instead. */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Forms */}
          <div className="lg:col-span-7 space-y-12">
            {/* Contact */}
            <section>
              <h2 className="text-2xl mb-2 flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-brand-forest text-white text-xs flex items-center justify-center font-sans not-italic">1</span>
                Contact
              </h2>
              <p className="text-sm text-brand-muted mb-5 ml-10">
                Signed in as <span className="font-medium text-brand-forest">{form.email}</span>.
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
                <span className="w-7 h-7 rounded-full bg-brand-forest text-white text-xs flex items-center justify-center font-sans not-italic">2</span>
                <Truck size={18} strokeWidth={1.5} className="text-brand-muted" />
                Shipping Address
              </h2>

              {addresses.length > 0 && !addingShip && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  {addresses.map((a) => (
                    <AddressPickCard key={a.id} a={a} selected={selectedShipId === a.id} onSelect={() => setShipId(a.id)} />
                  ))}
                  <AddNewCard onClick={() => setAddingShip(true)} />
                </div>
              )}

              {(addingShip || addresses.length === 0) && (
                <div className="border border-brand-line rounded-xl p-5 bg-brand-surface">
                  <h3 className="text-sm font-bold mb-4">{addresses.length === 0 ? 'Add a shipping address' : 'New address'}</h3>
                  <AddressForm
                    defaultName={defaultName}
                    busy={busyAddr}
                    submitLabel="Save & use this address"
                    showDefaultToggle={addresses.length > 0}
                    onSubmit={addShipAddress}
                    onCancel={addresses.length > 0 ? () => setAddingShip(false) : undefined}
                  />
                </div>
              )}

              {/* Billing */}
              <div className="mt-8 pt-6 border-t border-brand-line">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <MapPin size={14} className="text-brand-muted" /> Billing Address
                </h3>
                <label className="flex items-center gap-2 text-sm text-brand-ink cursor-pointer select-none mb-3">
                  <input
                    type="checkbox"
                    checked={billSameAsShip}
                    onChange={(e) => {
                      setBillSame(e.target.checked);
                      if (!e.target.checked && !selectedBillId) {
                        setBillId(addresses.find((a) => a.is_default)?.id ?? selectedShipId);
                      }
                    }}
                    className="accent-brand-leaf size-4"
                  />
                  Same as shipping address
                </label>

                {!billSameAsShip && (
                  <>
                    {addresses.length > 0 && !addingBill && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                        {addresses.map((a) => (
                          <AddressPickCard key={a.id} a={a} selected={selectedBillId === a.id} onSelect={() => setBillId(a.id)} showGstin />
                        ))}
                        <AddNewCard onClick={() => setAddingBill(true)} />
                      </div>
                    )}
                    {(addingBill || addresses.length === 0) && (
                      <div className="border border-brand-line rounded-xl p-5 bg-brand-surface">
                        <h3 className="text-sm font-bold mb-4">New billing address</h3>
                        <AddressForm
                          defaultName={defaultName}
                          busy={busyAddr}
                          submitLabel="Save & use this address"
                          showDefaultToggle={false}
                          onSubmit={addBillAddress}
                          onCancel={addresses.length > 0 ? () => setAddingBill(false) : undefined}
                        />
                      </div>
                    )}
                  </>
                )}
                <p className="text-[11px] text-brand-muted mt-2">
                  For a GST invoice, add the GSTIN on your billing address.
                </p>
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
            <div className="lg:sticky lg:top-28 border border-brand-ink/10 bg-brand-surface p-8 space-y-6 rounded-2xl">
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
                      <p className="font-display italic text-base leading-tight">{item.name}</p>
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
                      ? <span className="text-brand-leaf text-[10px] uppercase tracking-widest font-bold">Free</span>
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
                  <span className="font-display font-bold text-3xl text-brand-forest">{formatMoney(totals.total_paise)}</span>
                </div>
              </div>

              {freeShippingRemaining(totals.subtotal_paise, cfg) > 0 && (
                <p className="text-[12px] text-brand-muted text-center bg-brand-paper py-3 border border-brand-line rounded">
                  Add <span className="text-brand-forest font-bold">{formatMoney(freeShippingRemaining(totals.subtotal_paise, cfg))}</span> more for free shipping
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
                type="button"
                onClick={() => handleSubmit()}
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
                <Link to="/terms" className="underline hover:text-brand-forest">terms</Link>.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Small presentational helpers
// ─────────────────────────────────────────────────────────────────────────────

const AddressPickCard: React.FC<{ a: BookAddress; selected: boolean; onSelect: () => void; showGstin?: boolean }> = ({ a, selected, onSelect, showGstin }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left border p-3.5 rounded-xl transition-colors ${selected ? 'border-brand-leaf bg-brand-leaf/5' : 'border-brand-line hover:border-brand-forest'}`}
    >
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        {a.label && <span className="text-[11px] font-bold text-brand-ink">{a.label}</span>}
        {a.is_default && <span className="text-[9px] uppercase tracking-widest font-bold text-brand-leaf bg-brand-leaf/10 px-1.5 py-0.5 rounded">Default</span>}
        {showGstin && a.gstin && <span className="text-[9px] uppercase tracking-widest font-bold text-brand-muted bg-brand-band px-1.5 py-0.5 rounded">GST</span>}
      </div>
      <p className="text-sm text-brand-forest leading-snug">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
      <p className="text-xs text-brand-muted mt-0.5">{a.city}, {a.state} {a.pincode}</p>
      {showGstin && a.gstin && <p className="text-[11px] text-brand-muted mt-1 font-mono">GSTIN: {a.gstin}</p>}
    </button>
  );
}

function AddNewCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left border border-dashed border-brand-line p-3.5 rounded-xl text-sm font-medium text-brand-muted hover:border-brand-forest hover:text-brand-forest transition-colors inline-flex items-center gap-2"
    >
      <Plus size={14} /> Add a new address
    </button>
  );
}

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
        className={`w-full bg-transparent border-b border-brand-line py-3 focus:outline-none focus:border-brand-leaf text-lg placeholder:text-brand-muted/50 placeholder:not-italic ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
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
      className={`w-full flex items-center gap-4 px-5 py-4 border-2 rounded-xl transition-all text-left ${
        selected
          ? 'border-brand-leaf bg-brand-leaf/5'
          : 'border-brand-ink/15 hover:border-brand-ink/40'
      }`}
    >
      <div className={`w-10 h-10 flex items-center justify-center ${selected ? 'text-brand-leaf' : 'text-brand-muted'}`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[10px] uppercase tracking-widest text-brand-muted">{hint}</p>
      </div>
      <div className={`w-4 h-4 rounded-full border-2 ${selected ? 'border-brand-leaf bg-brand-leaf' : 'border-brand-ink/30'}`} />
    </button>
  );
}

// UUID v4-ish format check — used to gate orders from being placed with
// static-fallback cart items (which have non-UUID size IDs).
function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}
