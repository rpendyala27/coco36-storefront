/**
 * Password rules for sign-up and the reset page. The hint on both forms is
 * the rule: at least 8 characters, with a letter and a number.
 *
 * Reset emails use the implicit grant (src/lib/supabase.ts flowType). The
 * link lands as #access_token=…&type=recovery, or as ?code=…&type=recovery
 * when Supabase used a code. redirectTo is this origin plus
 * RESET_PASSWORD_PATH, so production (coco36.com) and preview hosts each
 * get their own URL. That URL has to be on the Supabase Auth redirect
 * allow-list or Supabase sends the shopper to the Site URL instead.
 */

export const RESET_PASSWORD_PATH = '/account/reset-password';

export const PASSWORD_HINT = 'At least 8 characters, using letters and numbers.';
export const PASSWORD_WEAK_MESSAGE = 'Use at least 8 characters, with letters and numbers.';
export const PASSWORD_MISMATCH_MESSAGE = 'Those passwords don’t match.';
export const PASSWORD_UPDATED_MESSAGE = 'Your password has been updated.';
export const PASSWORD_UPDATE_FAILED_MESSAGE = 'Could not update your password. Please try again.';
export const PASSWORD_REUSED_MESSAGE = 'Choose a password you have not used before.';
export const RESET_LINK_EXPIRED_MESSAGE = 'That link has expired or has already been used.';
export const RESET_LINK_SENT_MESSAGE = 'If an account exists for that email, we’ve sent a reset link. Check your inbox.';
export const SEND_NEW_LINK_LABEL = 'Send a new link';
/** Forgot-password step. Query on /auth so a signed-in shopper is not sent home. */
export const FORGOT_PASSWORD_PATH = '/auth?mode=forgot';

/** How long the success line stays up before the shopper is sent to /account. */
export const PASSWORD_UPDATED_REDIRECT_MS = 1600;

const LETTER = /\p{L}/u;
const NUMBER = /\p{N}/u;

export function passwordIsWeak(password: string): boolean {
  return password.length < 8 || !LETTER.test(password) || !NUMBER.test(password);
}

/** Absolute URL Supabase should put in the reset email. `origin` is window.location.origin. */
export function passwordResetRedirectTo(origin: string): string {
  const base = origin.endsWith('/') ? origin : `${origin}/`;
  return new URL(RESET_PASSWORD_PATH, base).href;
}

export type PasswordUpdateFailure = 'mismatch' | 'weak' | 'expired' | 'reused' | 'generic';

export function passwordUpdateMessage(reason: PasswordUpdateFailure): string {
  switch (reason) {
    case 'mismatch': return PASSWORD_MISMATCH_MESSAGE;
    case 'weak': return PASSWORD_WEAK_MESSAGE;
    case 'expired': return RESET_LINK_EXPIRED_MESSAGE;
    case 'reused': return PASSWORD_REUSED_MESSAGE;
    default: return PASSWORD_UPDATE_FAILED_MESSAGE;
  }
}

export function classifyPasswordUpdateError(error: unknown): Exclude<PasswordUpdateFailure, 'mismatch'> {
  const e = (error ?? {}) as { name?: string; message?: string; code?: string };
  const name = e.name ?? '';
  const code = (e.code ?? '').toLowerCase();
  const message = (e.message ?? '').toLowerCase();
  if (
    name === 'AuthSessionMissingError'
    || code === 'session_not_found'
    || code === 'otp_expired'
    || message.includes('auth session missing')
    || message.includes('session missing')
  ) {
    return 'expired';
  }
  if (
    name === 'AuthWeakPasswordError'
    || code === 'weak_password'
    || message.includes('weak password')
    || /password should be at least \d+/.test(message)
  ) {
    return 'weak';
  }
  if (code === 'same_password' || message.includes('should be different from the old password')) {
    return 'reused';
  }
  return 'generic';
}

/**
 * Client checks first (mismatch, the sign-up rule). Only a password that
 * passes those is sent to supabase.auth.updateUser.
 */
export async function submitNewPassword(
  password: string,
  confirm: string,
  update: (password: string) => Promise<{ error: unknown }>,
): Promise<{ ok: true } | { ok: false; reason: PasswordUpdateFailure }> {
  if (password !== confirm) return { ok: false, reason: 'mismatch' };
  if (passwordIsWeak(password)) return { ok: false, reason: 'weak' };
  try {
    const { error } = await update(password);
    if (error) return { ok: false, reason: classifyPasswordUpdateError(error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: classifyPasswordUpdateError(error) };
  }
}
