import { isGoogleOAuthReturn } from './googleAuth';

/**
 * What a Supabase Auth email link (password reset, signup confirmation) put in
 * the URL when it landed on the storefront.
 *
 * Read synchronously at module load, BEFORE the Supabase client is created
 * (src/lib/supabase.ts). The client strips the tokens from the URL and only
 * fires PASSWORD_RECOVERY a tick after it has stored the recovery session, so
 * anything that waits for that event can see a signed-in user first and treat
 * the visit as an ordinary sign-in. Knowing up front avoids that race.
 *
 * Implicit flow (this app's supabase client): success is
 *   #access_token=…&refresh_token=…&type=recovery
 * A code link (type=recovery plus ?code= or ?token_hash=) is the same
 * recovery visit. A failed, expired or reused link is
 *   #error=access_denied&error_code=otp_expired&error_description=…
 *
 * `type` may sit in the hash or the query. Search params are read as well
 * as the hash, because supabase-js prefers the query when both are set.
 */
export interface AuthLinkState {
  /** A password-recovery session is arriving in this URL. */
  recovery: boolean;
  /** Shopper-facing message when the link failed; null otherwise. */
  error: string | null;
  /** A signup-confirmation link just signed the shopper in (#…&type=signup). */
  signupConfirmed: boolean;
}

export const EXPIRED_LINK_MESSAGE =
  'That email link has expired or has already been used. Enter your email and choose "Forgot password?" to get a new one.';
export const FAILED_LINK_MESSAGE =
  'That email link didn’t work. Enter your email and choose "Forgot password?" to get a new one.';
export const GOOGLE_SIGNIN_ERROR_MESSAGE =
  'Google sign-in didn’t work. Please try again.';

const NONE: AuthLinkState = { recovery: false, error: null, signupConfirmed: false };

export function readAuthLink(href: string): AuthLinkState {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return NONE;
  }
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  // Query wins over the hash, matching supabase-js parseParametersFromURL.
  const param = (key: string) => url.searchParams.get(key) ?? hash.get(key);

  const errorCode = param('error_code');
  if (errorCode || param('error')) {
    // error_description is NOT shown: it comes from the URL, so anyone could
    // put their own text on our page with a crafted link.
    const error = isGoogleOAuthReturn(href)
      ? GOOGLE_SIGNIN_ERROR_MESSAGE
      : errorCode === 'otp_expired' ? EXPIRED_LINK_MESSAGE : FAILED_LINK_MESSAGE;
    return { recovery: false, error, signupConfirmed: false };
  }

  const has = (key: string) => hash.has(key) || url.searchParams.has(key);
  const withAccessToken = hash.has('access_token');
  // Credential the client can turn into a session: implicit access token
  // (hash or query), or a recovery code / token hash.
  const recoveryCredential = has('access_token') || has('code') || has('token_hash');
  const recovery = param('type') === 'recovery' && recoveryCredential;
  return {
    recovery,
    error: null,
    signupConfirmed: !recovery && hash.get('type') === 'signup' && withAccessToken,
  };
}

/**
 * supabase-js saves a URL session, then emits PASSWORD_RECOVERY on a
 * setTimeout(0). Callers that have just awaited getSession() must wait
 * this one tick before treating the shopper as an ordinary sign-in.
 * Queued after that timer, so the recovery callback runs first.
 */
export function afterPasswordRecoverySignal(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
