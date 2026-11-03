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
 * Implicit flow (supabase-js default): success is
 *   #access_token=…&refresh_token=…&type=recovery
 * and a failed, expired or reused link is
 *   #error=access_denied&error_code=otp_expired&error_description=…
 */
export interface AuthLinkState {
  /** A password-recovery session is arriving in this URL. */
  recovery: boolean;
  /** Shopper-facing message when the link failed; null otherwise. */
  error: string | null;
}

export const EXPIRED_LINK_MESSAGE =
  'That email link has expired or has already been used. Enter your email and choose "Forgot password?" to get a new one.';
export const FAILED_LINK_MESSAGE =
  'That email link didn’t work. Enter your email and choose "Forgot password?" to get a new one.';

const NONE: AuthLinkState = { recovery: false, error: null };

export function readAuthLink(href: string): AuthLinkState {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return NONE;
  }
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const param = (key: string) => hash.get(key) ?? url.searchParams.get(key);

  const errorCode = param('error_code');
  if (errorCode || param('error')) {
    // error_description is NOT shown: it comes from the URL, so anyone could
    // put their own text on our page with a crafted link.
    return { recovery: false, error: errorCode === 'otp_expired' ? EXPIRED_LINK_MESSAGE : FAILED_LINK_MESSAGE };
  }

  return { recovery: hash.get('type') === 'recovery' && hash.has('access_token'), error: null };
}
