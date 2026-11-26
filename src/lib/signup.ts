/**
 * What a supabase.auth.signUp() answer means for the shopper.
 *
 * With email confirmation on, a new account comes back with a user and no
 * session. With email-enumeration protection, an email that is already
 * registered comes back with NO error and an obfuscated user whose
 * `identities` list is empty. supabase-js 2.106.0–2.106.1 dropped the user on
 * the no-session answer (both cases came back as user: null), which showed new
 * shoppers "already exists"; we need >= 2.107.0 (lockfile guard in
 * tests/unit/signup.test.ts). If neither user nor session comes back we cannot
 * tell the two apart, so say something true for both.
 */
export type SignUpOutcome = 'signed_in' | 'confirm_email' | 'already_registered' | 'unknown';

export interface SignUpAnswer {
  user?: { identities?: unknown[] | null } | null;
  session?: unknown | null;
}

export function classifySignUp(data: SignUpAnswer | null | undefined): SignUpOutcome {
  if (data?.session) return 'signed_in';
  const user = data?.user;
  if (!user) return 'unknown';
  if (Array.isArray(user.identities) && user.identities.length === 0) return 'already_registered';
  return 'confirm_email';
}

export const SIGNUP_CONFIRM_MESSAGE = 'Check your email to confirm your account.';

/** Tappable phrases inside SIGNUP_EXISTS_MESSAGE. Labels are the visible copy. */
export const EXISTING_ACCOUNT_SIGN_IN_LABEL = 'Sign in';
export const EXISTING_ACCOUNT_GOOGLE_LABEL = 'continue with Google';
export const EXISTING_ACCOUNT_RESET_LABEL = 'reset your password';

export const SIGNUP_EXISTS_MESSAGE =
  `You already have an account with this email. ${EXISTING_ACCOUNT_SIGN_IN_LABEL}, ${EXISTING_ACCOUNT_GOOGLE_LABEL}, or ${EXISTING_ACCOUNT_RESET_LABEL}.`;

export type ExistingAccountAction = 'sign_in' | 'google' | 'reset_password';

export interface ExistingAccountPart {
  text: string;
  action?: ExistingAccountAction;
}

/**
 * The already-registered sentence split so the three actions can be buttons
 * without changing the approved copy. Joining `text` is SIGNUP_EXISTS_MESSAGE.
 */
export function existingAccountParts(): readonly ExistingAccountPart[] {
  return [
    { text: 'You already have an account with this email. ' },
    { text: EXISTING_ACCOUNT_SIGN_IN_LABEL, action: 'sign_in' },
    { text: ', ' },
    { text: EXISTING_ACCOUNT_GOOGLE_LABEL, action: 'google' },
    { text: ', or ' },
    { text: EXISTING_ACCOUNT_RESET_LABEL, action: 'reset_password' },
    { text: '.' },
  ];
}

export const SIGNUP_NEUTRAL_MESSAGE =
  'Check your email to confirm your account. Already registered? Sign in below or choose "Forgot password?".';
export const SIGNUP_CONFIRMED_MESSAGE = 'Email confirmed — you’re signed in.';
