import { createElement, type FormEvent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { ForgotPasswordForm } from '../../src/pages/Auth';
import { ResetPasswordView, resetPageMode, type ResetPasswordMode } from '../../src/pages/ResetPassword';
import { afterPasswordRecoverySignal } from '../../src/lib/authLink';
import {
  PASSWORD_HINT,
  PASSWORD_MISMATCH_MESSAGE,
  PASSWORD_REUSED_MESSAGE,
  PASSWORD_UPDATED_MESSAGE,
  PASSWORD_UPDATE_FAILED_MESSAGE,
  PASSWORD_WEAK_MESSAGE,
  RESET_LINK_EXPIRED_MESSAGE,
  RESET_LINK_SENT_MESSAGE,
  RESET_PASSWORD_PATH,
  FORGOT_PASSWORD_PATH,
  SEND_NEW_LINK_LABEL,
  passwordIsWeak,
  passwordResetRedirectTo,
  passwordUpdateMessage,
  submitNewPassword,
} from '../../src/lib/password';
import { staticPageMeta } from '../../src/seo/meta';

const read = (rel: string) => readFileSync(path.resolve(__dirname, '../..', rel), 'utf8');

describe('password rules (same as sign-up)', () => {
  it('accepts 8 or more characters that include a letter and a number', () => {
    expect(passwordIsWeak('abc12345')).toBe(false);
    expect(passwordIsWeak('Café1234')).toBe(false);
  });

  it('rejects short passwords, letters only, and numbers only', () => {
    expect(passwordIsWeak('')).toBe(true);
    expect(passwordIsWeak('abc123')).toBe(true);
    expect(passwordIsWeak('abcdefgh')).toBe(true);
    expect(passwordIsWeak('12345678')).toBe(true);
    expect(passwordUpdateMessage('weak')).toBe(PASSWORD_WEAK_MESSAGE);
  });
});

describe('passwordResetRedirectTo', () => {
  it('points production, preview, and local origins at /account/reset-password', () => {
    expect(passwordResetRedirectTo('https://coco36.com')).toBe('https://coco36.com/account/reset-password');
    expect(passwordResetRedirectTo('https://coco36.com/')).toBe('https://coco36.com/account/reset-password');
    expect(passwordResetRedirectTo('https://coco36-storefront-git-s22.vercel.app'))
      .toBe('https://coco36-storefront-git-s22.vercel.app/account/reset-password');
    expect(passwordResetRedirectTo('http://localhost:3000')).toBe('http://localhost:3000/account/reset-password');
    expect(RESET_PASSWORD_PATH).toBe('/account/reset-password');
  });
});

describe('submitNewPassword', () => {
  it('does not call updateUser when the passwords differ or the password is weak', async () => {
    const update = vi.fn(async () => ({ error: null }));
    expect(await submitNewPassword('abc12345', 'abc12346', update)).toEqual({ ok: false, reason: 'mismatch' });
    expect(await submitNewPassword('abcdefgh', 'abcdefgh', update)).toEqual({ ok: false, reason: 'weak' });
    expect(update).not.toHaveBeenCalled();
    expect(passwordUpdateMessage('mismatch')).toBe(PASSWORD_MISMATCH_MESSAGE);
  });

  it('calls updateUser with the new password and reports success', async () => {
    const update = vi.fn(async () => ({ error: null }));
    expect(await submitNewPassword('abc12345', 'abc12345', update)).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith('abc12345');
  });

  it('maps a missing session, a weak password, and a reused password to clear reasons', async () => {
    const expired = await submitNewPassword('abc12345', 'abc12345', async () => ({
      error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' },
    }));
    expect(expired).toEqual({ ok: false, reason: 'expired' });

    const weak = await submitNewPassword('abc12345', 'abc12345', async () => {
      throw { name: 'AuthWeakPasswordError', code: 'weak_password', message: 'Password should be at least 8 characters' };
    });
    expect(weak).toEqual({ ok: false, reason: 'weak' });

    const reused = await submitNewPassword('abc12345', 'abc12345', async () => ({
      error: { code: 'same_password', message: 'New password should be different from the old password.' },
    }));
    expect(reused).toEqual({ ok: false, reason: 'reused' });
    expect(passwordUpdateMessage('reused')).toBe(PASSWORD_REUSED_MESSAGE);

    const other = await submitNewPassword('abc12345', 'abc12345', async () => ({
      error: { message: 'over_request_rate_limit' },
    }));
    expect(other).toEqual({ ok: false, reason: 'generic' });
    expect(passwordUpdateMessage('generic')).toBe(PASSWORD_UPDATE_FAILED_MESSAGE);
  });
});

const viewProps: {
  mode: ResetPasswordMode;
  email: string | null;
  password: string;
  confirm: string;
  showPassword: boolean;
  showConfirm: boolean;
  error: string;
  submitting: boolean;
  onPassword: () => void;
  onConfirm: () => void;
  onTogglePassword: () => void;
  onToggleConfirm: () => void;
  onSubmit: (event: FormEvent) => void;
} = {
  mode: 'form',
  email: 'baker@example.com',
  password: '',
  confirm: '',
  showPassword: false,
  showConfirm: false,
  error: '',
  submitting: false,
  onPassword() {},
  onConfirm() {},
  onTogglePassword() {},
  onToggleConfirm() {},
  onSubmit(event: FormEvent) { event.preventDefault(); },
};

function view(overrides: Partial<typeof viewProps> = {}) {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    null,
    createElement(ResetPasswordView, { ...viewProps, ...overrides }),
  ));
}

describe('ResetPasswordView', () => {
  it('renders new password, confirm, the sign-up hint, and show toggles', () => {
    const html = view();
    expect(html).toContain('Set a new password');
    expect(html).toContain('for baker@example.com');
    expect(html).toContain(PASSWORD_HINT);
    expect(html).toContain('New password');
    expect(html).toContain('Confirm password');
    expect(html).toContain('type="password"');
    expect(html).toContain('aria-label="Show new password"');
    expect(html).toContain('aria-label="Show confirm password"');
    expect(html).toContain('Update password');
    expect(html).not.toMatch(/FSSAI|repack/i);
  });

  it('reveals a field when its toggle is on', () => {
    const html = view({ showPassword: true, showConfirm: false });
    expect(html).toContain('type="text"');
    expect(html).toContain('type="password"');
    expect(html).toContain('aria-label="Hide new password"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Show confirm password"');
  });

  it('shows a mismatch or weak-password error on the form', () => {
    const html = view({ error: PASSWORD_MISMATCH_MESSAGE });
    expect(html).toContain(PASSWORD_MISMATCH_MESSAGE);
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-invalid="true"');
  });

  it('shows a success line that names the account destination', () => {
    const html = view({ mode: 'success' });
    expect(html).toContain(PASSWORD_UPDATED_MESSAGE);
    expect(html).toContain('your account');
    expect(html).toContain('role="status"');
    expect(html).not.toContain('<form');
    expect(html).not.toMatch(/FSSAI|repack/i);
  });

  it('shows the expired-link state, with a send-a-new-link action back to forgot password', () => {
    const html = view({ mode: 'expired' });
    expect(html).toContain('Link expired');
    expect(html).toContain(RESET_LINK_EXPIRED_MESSAGE);
    expect(html).toContain(SEND_NEW_LINK_LABEL);
    expect(html).toContain(`href="${FORGOT_PASSWORD_PATH}"`);
    expect(html).not.toContain('href="/auth"');
    expect(html).not.toContain('<form');
    expect(html).not.toMatch(/FSSAI|repack/i);
  });
});

describe('resetPageMode', () => {
  const base = {
    updated: false,
    linkError: false,
    sessionExpired: false,
    passwordRecovery: false,
    signedIn: false,
  };

  it('shows the expired card for a failed link even when a session is already signed in', () => {
    expect(resetPageMode({ ...base, linkError: true, passwordRecovery: true, signedIn: true })).toBe('expired');
  });

  it('shows the form only for a recovery session, and success after the password is saved', () => {
    expect(resetPageMode({ ...base, passwordRecovery: true, signedIn: true })).toBe('form');
    expect(resetPageMode({ ...base, signedIn: true })).toBe('expired');
    expect(resetPageMode({ ...base, updated: true, passwordRecovery: false, signedIn: true })).toBe('success');
  });
});

function forgotForm(overrides: Partial<{
  email: string;
  error: string;
  sent: boolean;
  submitting: boolean;
}> = {}) {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    null,
    createElement(ForgotPasswordForm, {
      email: '',
      error: '',
      sent: false,
      submitting: false,
      onEmail() {},
      onSubmit(event: FormEvent) { event.preventDefault(); },
      backHref: '/auth',
      backLabel: 'Back to sign in',
      ...overrides,
    }),
  ));
}

describe('ForgotPasswordForm', () => {
  it('asks for an email and links back to sign-in', () => {
    const html = forgotForm();
    expect(html).toContain('Reset your password');
    expect(html).toContain('Enter your email.');
    expect(html).toContain('Send reset link');
    expect(html).toContain('href="/auth"');
    expect(html).toContain('<form');
    expect(html).not.toContain(RESET_LINK_SENT_MESSAGE);
  });

  it('keeps an empty-email or rate-limit error on the form', () => {
    const html = forgotForm({ error: 'Enter your email address first.' });
    expect(html).toContain('Enter your email address first.');
    expect(html).toContain('role="alert"');
    expect(html).toContain('<form');
    expect(html).not.toContain(RESET_LINK_SENT_MESSAGE);
  });

  it('leaves the confirmation up, with no form and no email address', () => {
    const html = forgotForm({ sent: true, email: 'baker@example.com' });
    expect(html).toContain(RESET_LINK_SENT_MESSAGE);
    expect(html).toContain('role="status"');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('baker@example.com');
  });
});

describe('reset password wiring', () => {
  const auth = read('src/pages/Auth.tsx');
  const page = read('src/pages/ResetPassword.tsx');
  const redirect = read('src/components/AuthLinkRedirect.tsx');
  const ctx = read('src/context/AuthContext.tsx');
  const app = read('src/App.tsx');

  it('sends resetPasswordForEmail at this origin’s reset route, and enforces the shared rule on sign-up', () => {
    expect(auth).toContain('passwordResetRedirectTo(window.location.origin)');
    expect(auth).toContain('resetPasswordForEmail(email');
    expect(auth).toContain('passwordIsWeak(password)');
    expect(auth).not.toContain('updateUser({ password');
    expect(auth).toContain('if (passwordRecovery) return;');
    expect(auth).toContain('if (forgot) return;');
    expect(auth).toContain('if (sawForgot.current === forgot) return;');
    expect(auth).toContain("setError(authLinkError ?? '')");
    expect(auth).toContain("params.get('mode') === 'forgot'");
    expect(auth).toContain('RESET_LINK_SENT_MESSAGE');
    expect(auth).toContain("setError('Enter your email address first.')");
    expect(auth).toContain("err?.message ?? 'Could not send reset email.'");
    expect(auth).not.toContain('Reset link sent to your email.');
    expect(auth).toContain('emailPasswordSignInPath(params.toString())');
    expect(auth).toContain('passwordSignInTo.current ?? redirectTo');
    expect(auth).toContain('googleOAuthRedirectTo(window.location.origin, redirectParam)');
    expect(auth).toContain("if (outcome === 'signed_in') navigate(redirectTo)");
  });

  it('the reset page calls updateUser and then routes to /account', () => {
    expect(page).toContain('supabase.auth.updateUser({ password: next })');
    expect(page).toContain("navigate('/account', { replace: true })");
    expect(page).toContain('PASSWORD_UPDATED_REDIRECT_MS');
    expect(page).toContain('resetPageMode(');
    expect(page).toContain('const linkError = Boolean(initialAuthLink.error)');
    expect(page).toContain('if (!linkError && loading) return <AuthPending />');
    expect(app).toContain('path="/account/reset-password"');
  });

  it('routes a recovery session to the reset page from anywhere, including / and /auth', () => {
    expect(redirect).toContain('RESET_PASSWORD_PATH');
    expect(redirect).toContain("navigate(RESET_PASSWORD_PATH, { replace: true })");
    expect(redirect).not.toContain('handled');
  });

  it('strips a failed-link hash before the Supabase client is created', () => {
    const client = read('src/lib/supabase.ts');
    const stripAt = client.indexOf('stripAuthErrorParams(window.location.href)');
    const clientAt = client.indexOf('export const supabase = createClient(');
    expect(stripAt).toBeGreaterThan(-1);
    expect(clientAt).toBeGreaterThan(stripAt);
  });

  it('waits for the PASSWORD_RECOVERY tick before pages can send a session to /', () => {
    expect(ctx).toMatch(/await afterPasswordRecoverySignal\(\);\s*if \(!active\) return;\s*setLoading\(false\);/);
    expect(ctx).toContain("if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);");
  });

  it('gives the reset route its own noindex title, not the order-page title', () => {
    const meta = staticPageMeta('/account/reset-password');
    expect(meta?.title).toBe('Set a New Password | COCO36');
    expect(meta?.robots).toMatch(/noindex/);
    expect(staticPageMeta('/account/orders/abc')?.title).toBe('Your Order | COCO36');
    expect(read('server/snapshot.ts')).toContain("'/account/reset-password': { h1: 'Set a new password'");
  });
});

describe('afterPasswordRecoverySignal', () => {
  it('resolves on a later turn, so a timer queued first still runs first', async () => {
    vi.useFakeTimers();
    const order: string[] = [];
    setTimeout(() => order.push('recovery'), 0);
    const pending = afterPasswordRecoverySignal().then(() => order.push('ready'));
    await vi.advanceTimersByTimeAsync(0);
    await pending;
    expect(order).toEqual(['recovery', 'ready']);
    vi.useRealTimers();
  });
});
