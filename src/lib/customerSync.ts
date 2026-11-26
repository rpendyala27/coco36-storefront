import { customerProfileHints, hintsForSignInSync, syncCustomerProfile } from './apiAuth';
import { supabase } from './supabase';

/**
 * Session fields the sign-in sync needs. Structural so AuthContext can pass
 * a Supabase session without a cast.
 */
export interface AuthSyncSession {
  access_token: string;
  user: {
    id: string;
    user_metadata?: Record<string, unknown> | null;
  };
}

type CustomerNamePhone = { name?: string | null; phone?: string | null } | null;

/**
 * SIGNED_IN always refreshes the customers row. A saved name/phone wins over
 * user_metadata, so a later sign-in does not overwrite an /account edit.
 * INITIAL_SESSION refreshes only when the row is missing: a reload does not
 * emit SIGNED_IN, and navigation that aborts the sign-in read would otherwise
 * leave no customers row for the address book.
 * A failed read syncs nothing. Omitted hints fall back to user_metadata and
 * could overwrite a profile saved on /account.
 */
export function shouldSyncCustomerProfile(
  event: string,
  existing: CustomerNamePhone,
  readFailed: boolean,
): boolean {
  if (readFailed) return false;
  if (event === 'SIGNED_IN') return true;
  if (event === 'INITIAL_SESSION') return existing == null;
  return false;
}

/**
 * Customers-row sync for one tab. `abort()` is navigation or unmount: an
 * in-flight read must not go on to call signup for a page that is gone. The
 * next load's INITIAL_SESSION creates the row if it is still missing.
 */
export function createAuthCustomerSync() {
  let syncedFor: string | null = null;
  let tail: Promise<void> = Promise.resolve();
  const abort = new AbortController();

  async function runOne(event: string, session: AuthSyncSession | null): Promise<void> {
    if (abort.signal.aborted || !session) return;
    if (event !== 'SIGNED_IN' && event !== 'INITIAL_SESSION') return;
    if (syncedFor === session.user.id) return;

    const { data: existing, error } = await supabase
      .from('customers')
      .select('name, phone')
      .eq('id', session.user.id)
      .maybeSingle();

    // Navigation during the read killed this call before signup. Leave
    // syncedFor unset so the next load can still create the row.
    if (abort.signal.aborted) return;
    // Row already present on a reload: do not mark this user synced. A
    // SIGNED_IN in the same tab still has to refresh blank name/phone.
    if (!shouldSyncCustomerProfile(event, existing ?? null, Boolean(error))) return;

    await syncCustomerProfile(session.access_token, hintsForSignInSync(customerProfileHints(session.user), existing ?? null));
    if (!abort.signal.aborted) syncedFor = session.user.id;
  }

  return {
    abort: () => abort.abort(),
    handle(event: string, session: AuthSyncSession | null): Promise<void> {
      const run = tail.then(() => runOne(event, session));
      tail = run.then(() => undefined, () => undefined);
      return run;
    },
  };
}

/**
 * The signed-in shopper's customers row exists before an address insert.
 * Idempotent: POST /api/customers/signup upserts, and a second call with the
 * saved name/phone does not clobber an /account edit.
 *
 * RLS lets the shopper read their customers row, not insert it (there is no
 * insert policy — see src/lib/profile.ts). The write goes through the admin
 * API, which takes the user id from the access token.
 */
export async function ensureCustomer(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token || !session.user) return;

  const { data: existing, error } = await supabase
    .from('customers')
    .select('name, phone')
    .eq('id', session.user.id)
    .maybeSingle();

  // Failed read: do not send metadata hints. They would overwrite an edit.
  if (error) return;

  await syncCustomerProfile(session.access_token, hintsForSignInSync(customerProfileHints(session.user), existing));
}
