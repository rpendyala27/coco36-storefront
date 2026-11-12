/**
 * Browser half of the post-merge Sentry check.
 *
 * The page may be opened as `/?sentry_test=<SENTRY_TEST_SECRET>`. The value
 * is removed from the address bar before Sentry or analytics read the URL,
 * then sent only as a request header. The server compares it to
 * SENTRY_TEST_SECRET. Nothing in the bundle can answer that comparison.
 */

export function stripSentryTestParam(href: string): { token: string | null; next: string } {
  const url = new URL(href, 'http://localhost');
  const raw = url.searchParams.get('sentry_test');
  if (raw === null) return { token: null, next: url.pathname + url.search + url.hash };
  url.searchParams.delete('sentry_test');
  const token = raw.trim();
  return { token: token.length > 0 ? token : null, next: url.pathname + url.search + url.hash };
}

/** Browser only. Returns null during SSR, tests, and ordinary page views. */
export function takeSentryTestToken(): string | null {
  if (typeof window === 'undefined') return null;
  const current = window.location.pathname + window.location.search + window.location.hash;
  const { token, next } = stripSentryTestParam(window.location.href);
  if (next !== current) window.history.replaceState(window.history.state, '', next);
  return token;
}
