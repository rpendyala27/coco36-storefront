import { API_URL, supabase } from './supabase';

/**
 * Calls to the admin API (admin.coco36.com) that act for a signed-in shopper
 * must carry the shopper's Supabase access token. The API verifies it with the
 * Supabase Auth server and takes the customer id and email ONLY from it, never
 * from the request body.
 */

/** `{ Authorization: 'Bearer …' }` for the current session, or null when signed out. */
export async function authHeader(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : null;
}

/**
 * Create or refresh the shopper's `customers` row (POST /api/customers/signup).
 * Call it whenever a session starts. Best-effort: checkout also ensures the row.
 */
export async function syncCustomerProfile(
  accessToken: string,
  profile: { name?: string; phone?: string } = {},
): Promise<void> {
  try {
    await fetch(`${API_URL}/api/customers/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ name: profile.name || undefined, phone: profile.phone || undefined }),
    });
  } catch {
    /* non-fatal */
  }
}

/** Same-site path only ("/x", not "//host" or "/\host"); anything else → fallback. */
export function safeRedirectPath(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}

/**
 * Name and phone to send with POST /api/customers/signup.
 * Google stores the display name as `full_name` (and usually `name`); email
 * sign-up stores `name` and optional `phone`. Empty values are omitted so a
 * Google session (which has no phone) cannot clear or invalidate the row.
 */
export function customerProfileHints(
  user: { user_metadata?: Record<string, unknown> | null } | null | undefined,
): { name?: string; phone?: string } {
  const meta = user?.user_metadata ?? {};
  const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const name = text(meta.full_name) ?? text(meta.name);
  const phone = text(meta.phone);
  return { ...(name ? { name } : {}), ...(phone ? { phone } : {}) };
}
