import { safeRedirectPath } from './apiAuth';

export { isGoogleOAuthReturn } from './authLink';

/**
 * Where Supabase should send the shopper after Google. Lands on /auth so the
 * existing session-to-redirect logic (and a failed-return message) can run.
 * `returnPath` is the in-app path from `?redirect=`, e.g. /checkout.
 */
export function googleOAuthRedirectTo(origin: string, returnPath?: string | null): string {
  const next = safeRedirectPath(returnPath, '/');
  const url = new URL('/auth', origin.endsWith('/') ? origin : `${origin}/`);
  if (next !== '/') url.searchParams.set('redirect', next);
  url.searchParams.set('oauth', 'google');
  return url.toString();
}
