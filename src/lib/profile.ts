import { API_URL, supabase } from './supabase';
import { authHeader } from './apiAuth';
import { normaliseIndianMobile, PHONE_INVALID_MESSAGE } from './phone';
import { browserStores, patchCheckoutDraftContact } from './userStorage';

/**
 * Shopper profile updates (name + phone). Email is never accepted here.
 *
 * There is no customer UPDATE RLS policy on public.customers (only
 * customers_read and a super_admin delete policy), so the storefront cannot
 * write the row directly. POST /api/customers/signup already updates the
 * signed-in customer's name/phone via ensure_customer(): the user id and
 * email come only from the Bearer token, and unknown body keys are dropped.
 */

export const NAME_MAX_LENGTH = 120;
export const NAME_INVALID_MESSAGE = 'Enter your name.';
export const NAME_TOO_LONG_MESSAGE = `Enter a name of ${NAME_MAX_LENGTH} characters or fewer.`;
export const PROFILE_SAVE_FAILED_MESSAGE = 'Could not save your profile. Please try again.';
export const PROFILE_SIGN_IN_MESSAGE = 'Please sign in to update your profile.';

export function normaliseCustomerName(input: string): string | null {
  const name = (input ?? '').trim().replace(/\s+/g, ' ');
  if (!name || name.length > NAME_MAX_LENGTH) return null;
  return name;
}

export function customerNameError(input: string): string | null {
  const name = (input ?? '').trim().replace(/\s+/g, ' ');
  if (!name) return NAME_INVALID_MESSAGE;
  if (name.length > NAME_MAX_LENGTH) return NAME_TOO_LONG_MESSAGE;
  return null;
}

export type ProfileUpdateResult =
  | { ok: true; name: string; phone: string }
  | { ok: false; error: string };

/**
 * Save the signed-in shopper's name and phone. On success, also updates the
 * checkout contact draft (so checkout prefills the new number) and mirrors
 * the values into auth user_metadata (so a later sign-in sync does not
 * overwrite them with stale metadata).
 */
export async function updateOwnProfile(input: { name: string; phone: string }): Promise<ProfileUpdateResult> {
  const nameErr = customerNameError(input.name);
  if (nameErr) return { ok: false, error: nameErr };
  const name = normaliseCustomerName(input.name)!;
  const phone = normaliseIndianMobile(input.phone);
  if (!phone) return { ok: false, error: PHONE_INVALID_MESSAGE };

  const auth = await authHeader();
  if (!auth) return { ok: false, error: PROFILE_SIGN_IN_MESSAGE };

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/customers/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth },
      body: JSON.stringify({ name, phone }),
    });
  } catch {
    return { ok: false, error: PROFILE_SAVE_FAILED_MESSAGE };
  }

  if (!res.ok) {
    let apiError = '';
    try {
      const body = (await res.json()) as { error?: unknown };
      if (typeof body?.error === 'string') apiError = body.error;
    } catch { /* ignore a non-JSON body */ }
    if (res.status === 401) return { ok: false, error: PROFILE_SIGN_IN_MESSAGE };
    if (res.status === 400) return { ok: false, error: apiError || 'Invalid name or phone' };
    return { ok: false, error: PROFILE_SAVE_FAILED_MESSAGE };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user.id;
  if (uid) {
    patchCheckoutDraftContact(browserStores().session, uid, { name, phone });
    try {
      await supabase.auth.updateUser({ data: { name, phone, full_name: name } });
    } catch {
      /* best-effort: the customers row is already saved */
    }
  }

  return { ok: true, name, phone };
}
