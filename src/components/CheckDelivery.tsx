import type React from 'react';
import { useEffect, useState } from 'react';
import { MapPin, Check, X, Loader2 } from 'lucide-react';
import { formatMoney } from '../lib/currency';
import { checkDelivery, etaText, joinWaitlist, PIN_RE, rememberPincode, savedPincode, type DeliveryCheck } from '../lib/delivery';

/**
 * "Check delivery" box (product page and cart). Remembers the PIN, shows the
 * ETA and fee, or "Not available here yet" with a "Notify me" email capture.
 * Checkout enforces delivery on the real address; this box only informs.
 */
export function CheckDelivery({ variantIds = [], compact = false }: { variantIds?: string[]; compact?: boolean }) {
  const [pin, setPin] = useState('');
  const [result, setResult] = useState<DeliveryCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const idsKey = variantIds.join(',');

  const run = async (p: string) => {
    if (!PIN_RE.test(p)) { setError('Enter a valid 6-digit PIN code.'); setResult(null); return; }
    setBusy(true); setError(null);
    try {
      setResult(await checkDelivery(p, { variantIds }));
      rememberPincode(p);
    } catch (e) {
      setError((e as Error).message); setResult(null);
    } finally {
      setBusy(false);
    }
  };

  // A remembered PIN is checked straight away (and again when the items change).
  useEffect(() => {
    const p = savedPincode();
    if (PIN_RE.test(p)) { setPin(p); void run(p); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const onSubmit = (e: React.FormEvent) => { e.preventDefault(); void run(pin.trim()); };

  return (
    <div className={compact ? 'text-sm' : 'border border-brand-line/60 rounded-xl p-4 text-sm'} data-testid="check-delivery">
      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <MapPin size={16} className="text-brand-leaf shrink-0" aria-hidden />
        <label htmlFor={`pin-${compact ? 'c' : 'p'}`} className="sr-only">Delivery PIN code</label>
        <input
          id={`pin-${compact ? 'c' : 'p'}`}
          inputMode="numeric" maxLength={6} placeholder="Delivery PIN code" value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          className="flex-1 min-w-0 bg-transparent border-b border-brand-line/70 py-1 focus:outline-none focus:border-brand-forest"
        />
        <button type="submit" disabled={busy} className="text-xs font-bold uppercase tracking-widest text-brand-forest disabled:opacity-40">
          {busy ? <Loader2 size={14} className="animate-spin" /> : 'Check'}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
      {result && <DeliveryAnswer pin={pin} result={result} />}
    </div>
  );
}

export function DeliveryAnswer({ pin, result }: { pin: string; result: DeliveryCheck }) {
  if (result.deliverable) {
    const eta = etaText(result);
    const fee = result.shippingFeePaise;
    const free = result.freeThresholdPaise;
    return (
      <p className="mt-2 flex items-start gap-1.5 text-brand-forest" data-testid="delivery-ok">
        <Check size={15} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          {eta ?? 'We deliver here'}
          {fee != null && <> · {fee === 0 ? 'free delivery' : `${formatMoney(fee)} delivery`}{free != null && fee > 0 ? `, free over ${formatMoney(free)}` : ''}</>}
          {!result.codAllowed && <> · prepaid only</>}
        </span>
      </p>
    );
  }
  return (
    <div className="mt-2" data-testid="delivery-no">
      <p className="flex items-start gap-1.5 text-brand-muted">
        <X size={15} className="mt-0.5 shrink-0" aria-hidden />
        <span>{result.message ?? `Not available at ${pin} yet.`}</span>
      </p>
      {(result.reason === 'blocked' || result.reason === 'no_zone' || result.reason === 'not_serviceable') && <NotifyMe pin={pin} />}
    </div>
  );
}

function NotifyMe({ pin }: { pin: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | string>('idle');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('busy');
    try { await joinWaitlist(email.trim(), pin); setState('done'); } catch (err) { setState((err as Error).message); }
  };
  if (state === 'done') return <p className="mt-2 text-brand-forest">Thanks. We&apos;ll email you when we deliver to {pin}.</p>;
  return (
    <form onSubmit={submit} className="mt-2 flex items-center gap-2">
      <label htmlFor="notify-email" className="sr-only">Email</label>
      <input id="notify-email" type="email" required placeholder="Email me when you deliver here" value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 min-w-0 bg-transparent border-b border-brand-line/70 py-1 focus:outline-none focus:border-brand-forest" />
      <button type="submit" disabled={state === 'busy'} className="text-xs font-bold uppercase tracking-widest text-brand-forest disabled:opacity-40">Notify me</button>
      {state !== 'idle' && state !== 'busy' && <span role="alert" className="text-red-700 text-xs">{state}</span>}
    </form>
  );
}
