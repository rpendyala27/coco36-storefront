import { describe, expect, it } from 'vitest';
import { EXPIRED_LINK_MESSAGE, FAILED_LINK_MESSAGE, readAuthLink } from '../../src/lib/authLink';

/** src/lib/authLink.ts: what a Supabase email link left in the URL. */

const base = 'https://coco36.com';

describe('readAuthLink', () => {
  it('spots a password-recovery session in the hash, on any path', () => {
    expect(readAuthLink(`${base}/auth#access_token=a.b.c&expires_in=3600&refresh_token=r&token_type=bearer&type=recovery`))
      .toEqual({ recovery: true, error: null });
    // Supabase falls back to the Site URL when redirect_to isn't allow-listed.
    expect(readAuthLink(`${base}/#access_token=a.b.c&refresh_token=r&type=recovery`))
      .toEqual({ recovery: true, error: null });
  });

  it('ignores ordinary sign-in links and plain pages', () => {
    expect(readAuthLink(`${base}/auth#access_token=a.b.c&refresh_token=r&type=signup`)).toEqual({ recovery: false, error: null });
    expect(readAuthLink(`${base}/36-steps#quality`)).toEqual({ recovery: false, error: null });
    expect(readAuthLink(`${base}/shop?q=vanilla`)).toEqual({ recovery: false, error: null });
  });

  it('needs the token itself, not just type=recovery', () => {
    expect(readAuthLink(`${base}/auth#type=recovery`)).toEqual({ recovery: false, error: null });
  });

  it('turns an expired or reused link into a clear message', () => {
    expect(readAuthLink(`${base}/auth#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`))
      .toEqual({ recovery: false, error: EXPIRED_LINK_MESSAGE });
    expect(readAuthLink(`${base}/?error=access_denied&error_code=otp_expired`))
      .toEqual({ recovery: false, error: EXPIRED_LINK_MESSAGE });
  });

  it('never echoes error_description from the URL', () => {
    const r = readAuthLink(`${base}/auth#error=server_error&error_description=Call+0000+to+verify+your+card`);
    expect(r).toEqual({ recovery: false, error: FAILED_LINK_MESSAGE });
    expect(r.error).not.toContain('0000');
  });

  it('survives garbage', () => {
    expect(readAuthLink('not a url')).toEqual({ recovery: false, error: null });
  });
});
