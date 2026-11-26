import { supabase } from './supabase';
import { ensureCustomer } from './customerSync';

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

/** Shown on /account and checkout when an address insert does not stick. */
export const ADDRESS_SAVE_FAILED_MESSAGE = "We couldn't save this address. Please try again.";

/** addresses.customer_id → customers.id. Missing customers row after a killed sign-in sync. */
function isCustomerFkViolation(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '23503') return true;
  return (error.message ?? '').includes('addresses_customer_id_fkey');
}

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

/** Unset every other live default. The new row is excluded so a failed insert
 *  never runs this, and a successful one is not wiped back to non-default. */
async function clearOtherDefaults(userId: string, keepId: string): Promise<void> {
  const { error } = await supabase
    .from('addresses')
    .update({ is_default: false })
    .eq('customer_id', userId)
    .neq('id', keepId)
    .is('deleted_at', null);
  if (error) console.error('[addresses] clearDefaults', error.message);
}

function insertAddress(userId: string, input: AddressInput, makeDefault: boolean) {
  return supabase
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
}

/**
 * Insert a new book row. The first address a customer saves becomes default.
 * The customers row is ensured first (signup upsert, not a client insert).
 * A 23503 from addresses_customer_id_fkey retries that ensure once — the
 * sign-in sync can still be in flight when the shopper saves.
 */
export async function addAddress(userId: string, input: AddressInput): Promise<BookAddress | null> {
  const existing = await listAddresses();
  const makeDefault = input.is_default ?? existing.length === 0;
  const hadDefault = existing.some((row) => row.is_default);

  await ensureCustomer();
  let { data, error } = await insertAddress(userId, input, makeDefault);
  if (isCustomerFkViolation(error)) {
    await ensureCustomer();
    ({ data, error } = await insertAddress(userId, input, makeDefault));
  }

  if (error || !data) {
    console.error('[addresses] add', error?.message);
    return null;
  }

  // Only after the new row exists. Clearing first left the book with no
  // default whenever the insert failed.
  if (makeDefault && hadDefault) await clearOtherDefaults(userId, data.id);
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
