/**
 * Browser storage that belongs to one signed-in shopper.
 *
 * The checkout contact draft is keyed by the user's id, so a second account
 * in the same tab never sees the first one's name or phone. The email is
 * never stored: checkout always shows the signed-in account's own email.
 * Sign-out (or a switch to another account) clears the drafts and the
 * remembered delivery PIN. The cart is deliberately kept (owner decision:
 * most shoppers use their own phone).
 */

/** Minimal Storage surface, so tests can pass a fake. */
export interface KeyStore {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const CHECKOUT_DRAFT_PREFIX = 'coco36.checkout-draft';
/** The remembered delivery PIN (src/lib/delivery.ts). */
export const PIN_STORAGE_KEY = 'coco36.pincode';

export type DraftPaymentMethod = 'prepaid' | 'cod';
export interface CheckoutDraft {
  name: string;
  phone: string;
  paymentMethod: DraftPaymentMethod;
}

export const EMPTY_CHECKOUT_DRAFT: CheckoutDraft = { name: '', phone: '', paymentMethod: 'prepaid' };

export function checkoutDraftKey(uid: string): string {
  return `${CHECKOUT_DRAFT_PREFIX}:${uid}`;
}

/** This user's saved draft (name, phone, payment method only), or null. */
export function readCheckoutDraft(storage: KeyStore | null | undefined, uid: string | null | undefined): CheckoutDraft | null {
  if (!storage || !uid) return null;
  try {
    const raw = storage.getItem(checkoutDraftKey(uid));
    if (!raw) return null;
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (!v || typeof v !== 'object') return null;
    return {
      name: typeof v.name === 'string' ? v.name : '',
      phone: typeof v.phone === 'string' ? v.phone : '',
      paymentMethod: v.paymentMethod === 'cod' ? 'cod' : 'prepaid',
    };
  } catch {
    return null;
  }
}

export function writeCheckoutDraft(storage: KeyStore | null | undefined, uid: string | null | undefined, draft: CheckoutDraft): void {
  if (!storage || !uid) return;
  const { name, phone, paymentMethod } = draft;
  try { storage.setItem(checkoutDraftKey(uid), JSON.stringify({ name, phone, paymentMethod })); } catch { /* quota / private mode */ }
}

export function clearCheckoutDraft(storage: KeyStore | null | undefined, uid: string | null | undefined): void {
  if (!storage || !uid) return;
  try { storage.removeItem(checkoutDraftKey(uid)); } catch { /* private mode */ }
}

/** Remove every checkout draft (any user, plus the old unkeyed one) and the
 *  remembered PIN. Leaves the cart, cookie consent and everything else. */
export function clearPerUserStorage(local: KeyStore | null | undefined, session: KeyStore | null | undefined): void {
  for (const store of [session, local]) {
    if (!store) continue;
    try {
      const drop: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k && (k === CHECKOUT_DRAFT_PREFIX || k.startsWith(`${CHECKOUT_DRAFT_PREFIX}:`))) drop.push(k);
      }
      drop.forEach((k) => store.removeItem(k));
    } catch { /* private mode */ }
  }
  try { local?.removeItem(PIN_STORAGE_KEY); } catch { /* private mode */ }
}

/** window.localStorage / sessionStorage, or null where they can't be used. */
export function browserStores(): { local: KeyStore | null; session: KeyStore | null } {
  if (typeof window === 'undefined') return { local: null, session: null };
  let local: KeyStore | null = null;
  let session: KeyStore | null = null;
  try { local = window.localStorage; } catch { /* blocked */ }
  try { session = window.sessionStorage; } catch { /* blocked */ }
  return { local, session };
}
