import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { classifySignUp } from '../../src/lib/signup';

/** src/lib/signup.ts: what a supabase.auth.signUp() answer means. */

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

describe('classifySignUp', () => {
  it('a session means signed in (email confirmation off)', () => {
    expect(classifySignUp({ user: { identities: [{ id: 'i1' }] }, session: { access_token: 't' } })).toBe('signed_in');
  });

  it('a new account with confirmation on: user with an identity, no session', () => {
    expect(classifySignUp({ user: { identities: [{ id: 'i1' }] }, session: null })).toBe('confirm_email');
  });

  it('an already-registered email (enumeration protection): empty identities', () => {
    expect(classifySignUp({ user: { identities: [] }, session: null })).toBe('already_registered');
  });

  it('neither user nor session: cannot tell, so neutral (never "already exists")', () => {
    expect(classifySignUp({ user: null, session: null })).toBe('unknown');
    expect(classifySignUp(null)).toBe('unknown');
    expect(classifySignUp(undefined)).toBe('unknown');
  });

  it('a user without an identities list is treated as new, not a duplicate', () => {
    expect(classifySignUp({ user: {}, session: null })).toBe('confirm_email');
    expect(classifySignUp({ user: { identities: null }, session: null })).toBe('confirm_email');
  });
});

describe('Auth page sign-up wiring', () => {
  const auth = read('src/pages/Auth.tsx');
  it('uses classifySignUp and no longer reads a null user as "already exists"', () => {
    expect(auth).toContain('classifySignUp(data)');
    expect(auth).not.toContain('!data.user && !data.session');
    expect(auth).toContain('SIGNUP_NEUTRAL_MESSAGE');
  });
});

describe('supabase-js lockfile guard', () => {
  // auth-js 2.106.0–2.106.1 returned user: null for a new unconfirmed signup,
  // which the old check showed as "already exists". 2.107.0 fixed it.
  const lock = JSON.parse(read('package-lock.json')) as { packages: Record<string, { version?: string }> };
  const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10));
  const atLeast = (v: string, min: string) => {
    const a = parse(v); const b = parse(min);
    for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
    return true;
  };

  it('resolves @supabase/auth-js and supabase-js to >= 2.107.0 everywhere', () => {
    const entries = Object.entries(lock.packages).filter(([k]) =>
      k.endsWith('node_modules/@supabase/auth-js') || k.endsWith('node_modules/@supabase/supabase-js'));
    expect(entries.length).toBeGreaterThanOrEqual(2);
    for (const [k, v] of entries) {
      expect(v.version, k).toBeTruthy();
      expect(atLeast(v.version!, '2.107.0'), `${k}@${v.version}`).toBe(true);
    }
  });
});
