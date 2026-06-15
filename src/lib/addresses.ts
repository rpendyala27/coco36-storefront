import { supabase } from './supabase';

/**
 * Customer address book.
 *
 * Addresses are reusable, nicknamed rows the customer manages from /account and
 * picks at checkout. RLS scopes every read/write to `customer_id = auth.uid()`.
 *
 * Immutability: a row may be referenced by a past order (orders.ship_address_id
 * / bill_address_id), and a delivered order / issued tax invoice must keep its
 * original address. So we never edit address *content* in place — `replace()`
 * creates a new row and soft-deletes the old one. Only `is_default` / `deleted_at`
 * flags are mutated on existing rows (neither shows on an invoice).
 */

export interface BookAddress {
  id:         string;
  label:      string | null;   // nickname — "Home", "Warehouse", "HQ"
  name:       string;
  line1:      string;
  line2:      string | null;
  city:       string;
  state:      string;
  pincode:    string;
  gstin:      string | null;
  is_default: boolean;
  created_at: string;
}

export interface AddressInput {
  label?:      string | null;
  name:        string;
  line1:       string;
  line2?:      string | null;
  city:        string;
  state:       string;
  pincode:     string;
  gstin?:      string | null;
  is_default?: boolean;
}

const SELECT = 'id, label, name, line1, line2, city, state, pincode, gstin, is_default, created_at';

/** Live (non-deleted) addresses for the signed-in customer, default first. */
export async function listAddresses(): Promise<BookAddress[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select(SELECT)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error || !data) {
    if (error) console.error('[addresses] list', error.message);
    return [];
  }
  return data as BookAddress[];
}

async function clearDefaults(userId: string): Promise<void> {
  await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('customer_id', userId)
    .is('deleted_at', null);
}

/** Insert a new book row. The first address a customer saves becomes default. */
export async function addAddress(userId: string, input: AddressInput): Promise<BookAddress | null> {
  const existing = await listAddresses();
  const makeDefault = input.is_default ?? existing.length === 0;
  if (makeDefault) await clearDefaults(userId);

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      customer_id: userId,
      label:   input.label?.trim() || null,
      name:    input.name,
      line1:   input.line1,
      line2:   input.line2?.trim() || null,
      city:    input.city,
      state:   input.state,
      pincode: input.pincode,
      gstin:   input.gstin?.trim() || null,
      country: 'India',
      is_default: makeDefault,
    })
    .select(SELECT)
    .single();

  if (error || !data) {
    console.error('[addresses] add', error?.message);
    return null;
  }
  return data as BookAddress;
}

/**
 * Edit = create a replacement + soft-delete the original, preserving the address
 * on any order that already references the old row. The default flag carries over.
 */
export async function replaceAddress(
  userId: string,
  oldId: string,
  input: AddressInput,
): Promise<BookAddress | null> {
  const created = await addAddress(userId, input);
  if (created) await softDeleteAddress(oldId);
  return created;
}

/** Soft delete — hides from the book but keeps the row for order history. */
export async function softDeleteAddress(id: string): Promise<void> {
  const { error } = await supabase
    .from('addresses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('[addresses] delete', error.message);
}

/** Make `id` the customer's default, unsetting the previous default. */
export async function setDefaultAddress(userId: string, id: string): Promise<void> {
  await clearDefaults(userId);
  const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id);
  if (error) console.error('[addresses] setDefault', error.message);
}

/** One-line summary for compact display. */
export function formatAddress(a: BookAddress): string {
  return [a.line1, a.line2, `${a.city}, ${a.state} ${a.pincode}`].filter(Boolean).join(', ');
}
