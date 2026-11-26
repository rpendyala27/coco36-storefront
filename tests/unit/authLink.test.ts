import { describe, expect, it } from 'vitest';
import { EXPIRED_LINK_MESSAGE, FAILED_LINK_MESSAGE, GOOGLE_SIGNIN_ERROR_MESSAGE, readAuthLink } from '../../src/lib/authLink';

/** src/lib/authLink.ts: what a Supabase email link left in the URL. */

const base = 'https://coco36.com';

describe('readAuthLink', () => {
  it('spots a password-recovery session in the hash, on any path', () => {
    expect(readAuthLink(`${base}/auth#access_token=a.b.c&expires_in=3600&refresh_token=r&token_type=bearer&type=recovery`))
      .toEqual({ recovery: true, error: null, signupConfirmed: false });
    // Supabase falls back to the Site URL when redirect_to isn't allow-listed.
    expect(readAuthLink(`${base}/#access_token=a.b.c&refresh_token=r&type=recovery`))
      .toEqual({ recovery: true, error: null, signupConfirmed: false });
  });

  it('ignores ordinary sign-in links and plain pages', () => {
    expect(readAuthLink(`${base}/36-steps#quality`)).toEqual({ recovery: false, error: null, signupConfirmed: false });
    expect(readAuthLink(`${base}/shop?q=vanilla`)).toEqual({ recovery: false, error: null, signupConfirmed: false });
  });

  it('needs the token itself, not just type=recovery', () => {
    expect(readAuthLink(`${base}/auth#type=recovery`)).toEqual({ recovery: false, error: null, signupConfirmed: false });
  });

  it('turns an expired or reused link into a clear message', () => {
    expect(readAuthLink(`${base}/auth#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`))
      .toEqual({ recovery: false, error: EXPIRED_LINK_MESSAGE, signupConfirmed: false });
    expect(readAuthLink(`${base}/?error=access_denied&error_code=otp_expired`))
      .toEqual({ recovery: false, error: EXPIRED_LINK_MESSAGE, signupConfirmed: false });
  });

  it('never echoes error_description from the URL', () => {
    const r = readAuthLink(`${base}/auth#error=server_error&error_description=Call+0000+to+verify+your+card`);
    expect(r).toEqual({ recovery: false, error: FAILED_LINK_MESSAGE, signupConfirmed: false });
    expect(r.error).not.toContain('0000');
  });

  it('survives garbage', () => {
    expect(readAuthLink('not a url')).toEqual({ recovery: false, error: null, signupConfirmed: false });
  });
});

describe('readAuthLink: signup confirmation', () => {
  it('flags a signup-confirmation session (on /auth or the Site URL fallback)', () => {
    expect(readAuthLink(`${base}/auth#access_token=a.b.c&refresh_token=r&type=signup`))
      .toEqual({ recovery: false, error: null, signupConfirmed: true });
    expect(readAuthLink(`${base}/#access_token=a.b.c&refresh_token=r&type=signup`).signupConfirmed).toBe(true);
  });

  it('needs the token, and is not set by recovery, magic-link or error links', () => {
    expect(readAuthLink(`${base}/auth#type=signup`).signupConfirmed).toBe(false);
    expect(readAuthLink(`${base}/auth#access_token=a.b.c&type=recovery`).signupConfirmed).toBe(false);
    expect(readAuthLink(`${base}/auth#access_token=a.b.c&type=magiclink`).signupConfirmed).toBe(false);
    expect(readAuthLink(`${base}/auth#error=access_denied&error_code=otp_expired&type=signup`).signupConfirmed).toBe(false);
  });
});

describe('readAuthLink: Google OAuth return', () => {
  it('uses a Google-specific message when the return URL is marked oauth=google', () => {
    expect(readAuthLink(`${base}/auth?oauth=google&redirect=%2Fcheckout#error=access_denied&error_code=access_denied`))
      .toEqual({ recovery: false, error: GOOGLE_SIGNIN_ERROR_MESSAGE, signupConfirmed: false });
    expect(readAuthLink(`${base}/auth?oauth=google&error=server_error&error_description=Call+0000`))
      .toEqual({ recovery: false, error: GOOGLE_SIGNIN_ERROR_MESSAGE, signupConfirmed: false });
  });

  it('does not treat a successful Google return (hash tokens, no type) as recovery or signup', () => {
    expect(readAuthLink(`${base}/auth?oauth=google&redirect=%2Fcheckout#access_token=a.b.c&refresh_token=r&token_type=bearer`))
      .toEqual({ recovery: false, error: null, signupConfirmed: false });
  });

  it('leaves ordinary email-link errors unchanged when oauth=google is absent', () => {
    expect(readAuthLink(`${base}/auth#error=access_denied&error_code=otp_expired`).error).toBe(EXPIRED_LINK_MESSAGE);
    expect(readAuthLink(`${base}/auth#error=server_error`).error).toBe(FAILED_LINK_MESSAGE);
  });
});
