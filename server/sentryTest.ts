import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Gate for /api/sentry-test.
 *
 * `deny`    — secret unset, header missing, or header does not match. The
 *             route answers 404, the same way in every case.
 * `browser` — header matches and `probe=browser`. The route answers 204 so
 *             the page can throw a render error on purpose.
 * `server`  — header matches otherwise. The route throws, the wrapper
 *             flushes Sentry, and the platform returns 500.
 */
export type SentryTestDecision = 'deny' | 'browser' | 'server';

function sameSecret(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

export function decideSentryTest(opts: {
  secret: string | undefined;
  header: string | undefined;
  probe: string | undefined;
}): SentryTestDecision {
  const secret = opts.secret?.trim() ?? '';
  const header = opts.header?.trim() ?? '';
  if (!secret || !header || !sameSecret(header, secret)) return 'deny';
  return opts.probe === 'browser' ? 'browser' : 'server';
}

export function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function probeFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url, 'http://localhost').searchParams.get('probe') ?? undefined;
  } catch {
    return undefined;
  }
}
