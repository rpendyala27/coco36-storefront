import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  checkoutDraftKey, clearCheckoutDraft, clearPerUserStorage, CHECKOUT_DRAFT_PREFIX, PIN_STORAGE_KEY,
  patchCheckoutDraftContact, readCheckoutDraft, writeCheckoutDraft, type KeyStore,
} from '../../src/lib/userStorage';

/** src/lib/userStorage.ts: per-shopper browser storage (checkout draft, PIN). */

class FakeStore implements KeyStore {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
}

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

describe('checkout draft', () => {
  it('is keyed by user id; another account gets nothing', () => {
    const s = new FakeStore();
    writeCheckoutDraft(s, 'owner', { name: 'COCO36 QA', phone: '9999999999', paymentMethod: 'prepaid' });
    expect(readCheckoutDraft(s, 'owner')).toEqual({ name: 'COCO36 QA', phone: '9999999999', paymentMethod: 'prepaid' });
    expect(readCheckoutDraft(s, 'new-user')).toBeNull();
    expect(readCheckoutDraft(s, null)).toBeNull();
  });

  it('never stores or restores an email', () => {
    const s = new FakeStore();
    writeCheckoutDraft(s, 'u1', { name: 'A', phone: '9876543210', paymentMethod: 'cod', email: 'x@y.z' } as never);
    expect(s.getItem(checkoutDraftKey('u1'))).not.toContain('x@y.z');
    s.setItem(checkoutDraftKey('u2'), JSON.stringify({ name: 'B', email: 'old@owner.com' }));
    const d = readCheckoutDraft(s, 'u2');
    expect(d).toEqual({ name: 'B', phone: '', paymentMethod: 'prepaid' });
    expect(JSON.stringify(d)).not.toContain('old@owner.com');
  });

  it('ignores the old unkeyed draft and survives garbage', () => {
    const s = new FakeStore();
    s.setItem(CHECKOUT_DRAFT_PREFIX, JSON.stringify({ name: 'Old', email: 'old@owner.com', phone: '9999999999' }));
    expect(readCheckoutDraft(s, 'u1')).toBeNull();
    s.setItem(checkoutDraftKey('u1'), '{not json');
    expect(readCheckoutDraft(s, 'u1')).toBeNull();
  });

  it('clearCheckoutDraft drops only that user', () => {
    const s = new FakeStore();
    writeCheckoutDraft(s, 'a', { name: 'A', phone: '', paymentMethod: 'prepaid' });
    writeCheckoutDraft(s, 'b', { name: 'B', phone: '', paymentMethod: 'prepaid' });
    clearCheckoutDraft(s, 'a');
    expect(readCheckoutDraft(s, 'a')).toBeNull();
    expect(readCheckoutDraft(s, 'b')?.name).toBe('B');
  });
});

describe('clearPerUserStorage (sign-out / account switch)', () => {
  it('removes every checkout draft and the PIN; keeps the cart and consent', () => {
    const local = new FakeStore();
    const session = new FakeStore();
    writeCheckoutDraft(session, 'a', { name: 'A', phone: '', paymentMethod: 'prepaid' });
    writeCheckoutDraft(session, 'b', { name: 'B', phone: '', paymentMethod: 'prepaid' });
    session.setItem(CHECKOUT_DRAFT_PREFIX, '{}');
    session.setItem('coco36.scrollCatalog', '1');
    local.setItem(PIN_STORAGE_KEY, '530045');
    local.setItem('coco36.cart', '[{"sizeId":"x"}]');
    local.setItem('coco36.consent', 'granted');

    clearPerUserStorage(local, session);

    expect([...session.m.keys()]).toEqual(['coco36.scrollCatalog']);
    expect(local.getItem(PIN_STORAGE_KEY)).toBeNull();
    expect(local.getItem('coco36.cart')).toBe('[{"sizeId":"x"}]');
    expect(local.getItem('coco36.consent')).toBe('granted');
  });

  it('tolerates missing stores', () => {
    expect(() => clearPerUserStorage(null, undefined)).not.toThrow();
  });

  it('uses the same PIN key as the delivery check', () => {
    expect(PIN_STORAGE_KEY).toBe('coco36.pincode');
    expect(read('src/lib/delivery.ts')).toContain('const PIN_KEY = PIN_STORAGE_KEY;');
  });
});

describe('wiring', () => {
  const checkout = read('src/pages/Checkout.tsx');
  const authCtx = read('src/context/AuthContext.tsx');

  it('checkout shows and sends the signed-in account email, never a draft one', () => {
    expect(checkout).toContain('Signed in as <span className="font-medium text-brand-forest">{accountEmail}</span>');
    expect(checkout).toContain('prefill:  { name: form.name, email: accountEmail, contact: form.phone }');
    expect(checkout).toContain('value={accountEmail}');
    expect(checkout).not.toContain('form.email');
    expect(checkout).toContain('const accountEmail = user?.email');
  });

  it('checkout reads the draft per user after auth, and saves only for that user', () => {
    expect(checkout).not.toContain("sessionStorage.getItem(DRAFT_KEY)");
    expect(checkout).toContain('readCheckoutDraft(browserStores().session, uid)');
    expect(checkout).toContain('if (!uid || draftUid !== uid) return;');
    expect(checkout).toContain('if (!uid || !profile || profile.id !== uid) return;');
  });

  it('AuthContext clears per-user storage on SIGNED_OUT and on an account switch, and drops stale profiles', () => {
    expect(authCtx).toContain("if (event === 'SIGNED_OUT') {");
    expect(authCtx).toContain('clearPerUserStorage(local, session)');
    expect(authCtx).toContain('currentUid !== session.user.id');
    expect(authCtx).toContain('if (active && currentUid === authUser.id) setProfile(');
  });

  it('does not clear the cart on sign-out (owner decision)', () => {
    expect(authCtx).not.toMatch(/useCart|CartContext|coco36\.cart/);
  });
});

describe('patchCheckoutDraftContact', () => {
  it('updates name and phone and keeps the payment method', () => {
    const s = new FakeStore();
    writeCheckoutDraft(s, 'u1', { name: 'Old', phone: '9999999999', paymentMethod: 'cod' });
    patchCheckoutDraftContact(s, 'u1', { name: 'Asha', phone: '9876543210' });
    expect(readCheckoutDraft(s, 'u1')).toEqual({ name: 'Asha', phone: '9876543210', paymentMethod: 'cod' });
  });
  it('creates a draft when none exists', () => {
    const s = new FakeStore();
    patchCheckoutDraftContact(s, 'u1', { name: 'Asha', phone: '9876543210' });
    expect(readCheckoutDraft(s, 'u1')).toEqual({ name: 'Asha', phone: '9876543210', paymentMethod: 'prepaid' });
  });
});

