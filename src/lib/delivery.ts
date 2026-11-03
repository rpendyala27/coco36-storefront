import { API_URL } from './supabase';

/**
 * Delivery check (Phase 2A): asks the admin API whether we deliver to a PIN,
 * at what fee and how fast. Display only: /api/orders/create and the
 * database enforce the same rules on the real address at checkout.
 */

export interface DeliveryCheck {
  deliverable: boolean;
  reason: 'ok' | 'blocked' | 'no_zone' | 'item_restricted' | 'not_serviceable' | 'courier_error';
  message: string | null;
  etaMin: number | null;
  etaMax: number | null;
  shippingFeePaise: number | null;
  freeThresholdPaise: number | null;
  codExtraPaise: number | null;
  codAllowed: boolean;
  restrictedItems: { productId: string; name: string }[];
}

const PIN_KEY = 'coco36.pincode';
export const PIN_RE = /^[1-9][0-9]{5}$/;

export function savedPincode(): string {
  try { return window.localStorage.getItem(PIN_KEY) ?? ''; } catch { return ''; }
}
export function rememberPincode(pin: string) {
  try { window.localStorage.setItem(PIN_KEY, pin); } catch { /* private mode */ }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function checkDelivery(pin: string, opts: { variantIds?: string[]; cod?: boolean } = {}): Promise<DeliveryCheck> {
  const qs = new URLSearchParams({ country: 'IN', pin });
  const ids = (opts.variantIds ?? []).filter((id) => UUID_RE.test(id)).slice(0, 50);
  if (ids.length) qs.set('variants', ids.join(','));
  if (opts.cod) qs.set('cod', '1');
  const res = await fetch(`${API_URL}/api/serviceability?${qs}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? "We couldn't check delivery right now. Please try again.");
  return body as DeliveryCheck;
}

export async function joinWaitlist(email: string, pin: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/delivery/waitlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, country: 'IN', pin }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "We couldn't save that. Please try again.");
  }
}

/** "Delivers in 3–7 days" / "Delivers in 2 days" / null when unknown. */
export function etaText(c: Pick<DeliveryCheck, 'etaMin' | 'etaMax'>): string | null {
  if (c.etaMin == null && c.etaMax == null) return null;
  const lo = c.etaMin ?? c.etaMax!;
  const hi = c.etaMax ?? c.etaMin!;
  return lo === hi ? `Delivers in ${lo} day${lo === 1 ? '' : 's'}` : `Delivers in ${lo}–${hi} days`;
}
