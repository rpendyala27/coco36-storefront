/**
 * Google's return is marked `?oauth=google` (see googleAuth.ts). This check
 * lives here, not in googleAuth.ts: googleAuth imports apiAuth, which imports
 * the Supabase client, which calls readAuthLink while this module is still
 * starting. Importing googleAuth from here made that call run before
 * EXPIRED_LINK_MESSAGE existed, so a failed reset link never painted.
 */
export function isGoogleOAuthReturn(href: string): boolean {
  try {
    return new URL(href).searchParams.get('oauth') === 'google';
  } catch {
    return false;
  }
}

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
  // Any of these means the link failed. error_description is NOT shown: it
  // comes from the URL, so anyone could put their own text on our page.
  if (errorCode || param('error') || param('error_description')) {
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
const AUTH_ERROR_PARAMS = ['error', 'error_code', 'error_description'] as const;

/**
 * Same URL with a failed-link's error, error_code, and error_description
 * removed from the query and the hash. Other params (a recovery token, the
 * Google return marker) stay. The description text is never copied into the
 * result.
 */
export function stripAuthErrorParams(href: string): string {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return href;
  }
  for (const key of AUTH_ERROR_PARAMS) url.searchParams.delete(key);
  if (url.hash.startsWith('#')) {
    const hash = new URLSearchParams(url.hash.slice(1));
    let changed = false;
    for (const key of AUTH_ERROR_PARAMS) {
      if (hash.has(key)) {
        hash.delete(key);
        changed = true;
      }
    }
    if (changed) {
      const next = hash.toString();
      url.hash = next ? `#${next}` : '';
    }
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * A used or expired reset link must stay on screen when this browser is
 * already signed in. `/` and `/auth` are the two places those links land.
 * Other pages still go to `/auth`. The reset page has its own expired state.
 */
export function stayOnPageForAuthLinkError(pathname: string, signedIn: boolean): boolean {
  if (pathname === '/auth' || pathname === '/account/reset-password') return true;
  return pathname === '/' && signedIn;
}

export function afterPasswordRecoverySignal(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
