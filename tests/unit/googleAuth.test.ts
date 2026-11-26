import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { googleOAuthRedirectTo, isGoogleOAuthReturn } from '../../src/lib/googleAuth';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

describe('googleOAuthRedirectTo', () => {
  it('lands on /auth with the oauth marker and a safe return path', () => {
    expect(googleOAuthRedirectTo('https://coco36.com', '/checkout'))
      .toBe('https://coco36.com/auth?redirect=%2Fcheckout&oauth=google');
    expect(googleOAuthRedirectTo('https://coco36.com/', '/account'))
      .toBe('https://coco36.com/auth?redirect=%2Faccount&oauth=google');
  });

  it('omits redirect when the return path is home or unsafe', () => {
    expect(googleOAuthRedirectTo('https://coco36.com', '/')).toBe('https://coco36.com/auth?oauth=google');
    expect(googleOAuthRedirectTo('https://coco36.com', null)).toBe('https://coco36.com/auth?oauth=google');
    expect(googleOAuthRedirectTo('https://coco36.com', 'https://evil.example'))
      .toBe('https://coco36.com/auth?oauth=google');
    expect(googleOAuthRedirectTo('https://coco36.com', '//evil.example'))
      .toBe('https://coco36.com/auth?oauth=google');
  });
});

describe('isGoogleOAuthReturn', () => {
  it('is true only when oauth=google is in the query', () => {
    expect(isGoogleOAuthReturn('https://coco36.com/auth?oauth=google&redirect=/checkout')).toBe(true);
    expect(isGoogleOAuthReturn('https://coco36.com/auth?redirect=/checkout')).toBe(false);
    expect(isGoogleOAuthReturn('not a url')).toBe(false);
  });
});

describe('Auth page Google sign-in wiring', () => {
  const auth = read('src/pages/Auth.tsx');
  it('adds Continue with Google via signInWithOAuth and keeps email/password', () => {
    expect(auth).toContain('Continue with Google');
    expect(auth).toContain("signInWithOAuth({");
    expect(auth).toContain("provider: 'google'");
    expect(auth).toContain('googleOAuthRedirectTo(window.location.origin, redirectParam)');
    expect(auth).toContain('signInWithPassword');
    expect(auth).toContain('signUp({');
  });
});

describe('AuthContext OAuth profile sync', () => {
  const ctx = read('src/context/AuthContext.tsx');
  const sync = read('src/lib/customerSync.ts');
  it('sends user_metadata name (full_name) on SIGNED_IN, preferring a saved customers row', () => {
    expect(sync).toContain('customerProfileHints(session.user)');
    expect(sync).toContain('syncCustomerProfile(session.access_token, hintsForSignInSync(customerProfileHints(session.user), existing ?? null))');
    expect(ctx).toContain('customerSync.handle(event, session)');
    expect(ctx).toContain("event === 'SIGNED_IN' || event === 'INITIAL_SESSION'");
  });
});

describe('Supabase client keeps implicit flow for email links and Google', () => {
  const client = read('src/lib/supabase.ts');
  it('detects the session in the URL and does not switch to PKCE', () => {
    expect(client).toContain('detectSessionInUrl: true');
    expect(client).toContain("flowType: 'implicit'");
    expect(client).not.toContain("flowType: 'pkce'");
  });
});
