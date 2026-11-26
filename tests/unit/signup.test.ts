import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AlreadyRegisteredNotice } from '../../src/components/AlreadyRegisteredNotice';
import { classifySignUp, existingAccountParts, SIGNUP_EXISTS_MESSAGE } from '../../src/lib/signup';

const ALREADY_REGISTERED_COPY =
  'You already have an account with this email. Sign in, continue with Google, or reset your password.';

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

describe('already-registered copy', () => {
  it('is the owner-approved sentence, including the three action labels', () => {
    expect(SIGNUP_EXISTS_MESSAGE).toBe(ALREADY_REGISTERED_COPY);
    expect(existingAccountParts().map((part) => part.text).join('')).toBe(ALREADY_REGISTERED_COPY);
    expect(existingAccountParts().filter((part) => part.action).map((part) => [part.action, part.text])).toEqual([
      ['sign_in', 'Sign in'],
      ['google', 'continue with Google'],
      ['reset_password', 'reset your password'],
    ]);
  });
});

describe('AlreadyRegisteredNotice', () => {
  const html = renderToStaticMarkup(createElement(AlreadyRegisteredNotice, {
    onSignIn() {},
    onGoogle() {},
    onResetPassword() {},
  }));
  const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? [];

  it('renders the approved sentence and nothing else', () => {
    expect(html.replace(/<[^>]+>/g, '')).toBe(ALREADY_REGISTERED_COPY);
  });

  it('makes the three phrases buttons styled as links, in tab order', () => {
    expect(buttons).toHaveLength(3);
    expect(buttons.map((button) => button.replace(/<[^>]+>/g, ''))).toEqual([
      'Sign in',
      'continue with Google',
      'reset your password',
    ]);
    for (const button of buttons) {
      expect(button).toContain('type="button"');
      expect(button).toContain('underline');
      expect(button).not.toContain('tabindex="-1"');
    }
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('<a ');
    expect(html).toContain('data-action="sign_in"');
    expect(html).toContain('data-action="google"');
    expect(html).toContain('data-action="reset_password"');
  });
});

describe('Auth page sign-up wiring', () => {
  const auth = read('src/pages/Auth.tsx');
  it('uses classifySignUp and no longer reads a null user as "already exists"', () => {
    expect(auth).toContain('classifySignUp(data)');
    expect(auth).not.toContain('!data.user && !data.session');
    expect(auth).toContain('SIGNUP_NEUTRAL_MESSAGE');
  });

  it('shows the approved notice and wires Sign in, Google, and password reset', () => {
    expect(auth).toContain('setError(SIGNUP_EXISTS_MESSAGE)');
    expect(auth).toContain('showSignIn()');
    expect(auth).toMatch(/const showSignIn = \(\) => \{\s*setIsLogin\(true\);\s*setEmail\(email\);/);
    expect(auth).toContain('<AlreadyRegisteredNotice');
    expect(auth).toContain('onSignIn={showSignIn}');
    expect(auth).toContain('onGoogle={handleGoogle}');
    expect(auth).toContain('onResetPassword={handleReset}');
    expect(auth).toContain('resetPasswordForEmail(email');
    expect(auth).toContain("signInWithOAuth({");
    expect(read('src/lib/signup.ts')).not.toContain('please sign in below');
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
