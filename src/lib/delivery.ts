import { API_URL } from './supabase';
import { PIN_STORAGE_KEY } from './userStorage';

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

const PIN_KEY = PIN_STORAGE_KEY;
export const PIN_RE = /^[1-9][0-9]{5}$/;

/**
 * India Post PIN zones by first two digits. 6 digits starting 1–9 is not
 * enough: 100000 (no circle 10) and 999999 (Army Postal Service) pass that
 * shape but are not addresses we can ship to (F45). Unused prefixes: 10, 29,
 * 35, 54, 55, 65, 66, 86–89; 90–99 are field post offices.
 */
const PIN_PREFIXES = new Set([
  ...range(11, 28), ...range(30, 34), ...range(36, 53), ...range(56, 64), ...range(67, 85),
].map(String));
function range(a: number, b: number): number[] {
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export const PIN_INVALID_MESSAGE = 'Enter a valid 6-digit PIN code.';
export const PIN_UNKNOWN_MESSAGE = "That isn't a PIN code we recognise. Check it and try again.";

/** Null when the PIN can be checked; otherwise the message to show. */
export function pinProblem(pin: string): string | null {
  if (!PIN_RE.test(pin)) return PIN_INVALID_MESSAGE;
  if (!PIN_PREFIXES.has(pin.slice(0, 2))) return PIN_UNKNOWN_MESSAGE;
  return null;
}

export function isCheckablePin(pin: string): boolean {
  return pinProblem(pin) === null;
}

/** The remembered PIN, only if it is still a real PIN (a stale or bad one is dropped). */
export function savedPincode(): string {
  try {
    const p = window.localStorage.getItem(PIN_KEY) ?? '';
    if (p && !isCheckablePin(p)) { window.localStorage.removeItem(PIN_KEY); return ''; }
    return p;
  } catch { return ''; }
}
/** Remember a PIN we deliver to. Callers only pass PINs the API said are served. */
export function rememberPincode(pin: string) {
  if (!isCheckablePin(pin)) return;
  try { window.localStorage.setItem(PIN_KEY, pin); } catch { /* private mode */ }
}
export function forgetPincode() {
  try { window.localStorage.removeItem(PIN_KEY); } catch { /* private mode */ }
}

/** The waitlist offer shows for a real PIN we don't serve (not for errors or restricted items). */
export function showsWaitlist(result: Pick<DeliveryCheck, 'deliverable' | 'reason'>): boolean {
  return !result.deliverable && (result.reason === 'blocked' || result.reason === 'no_zone' || result.reason === 'not_serviceable');
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
