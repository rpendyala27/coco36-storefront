import React, { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { normaliseIndianMobile, PHONE_INVALID_MESSAGE } from '../lib/phone';
import { emailPasswordSignInPath, safeRedirectPath } from '../lib/apiAuth';
import { googleOAuthRedirectTo } from '../lib/googleAuth';
import { AlreadyRegisteredNotice } from '../components/AlreadyRegisteredNotice';
import { AuthPending, useAuth } from '../context/AuthContext';
import {
  PASSWORD_HINT, PASSWORD_WEAK_MESSAGE, RESET_LINK_SENT_MESSAGE, passwordIsWeak, passwordResetRedirectTo,
} from '../lib/password';
import {
  classifySignUp, SIGNUP_CONFIRM_MESSAGE, SIGNUP_EXISTS_MESSAGE, SIGNUP_NEUTRAL_MESSAGE,
} from '../lib/signup';

const inputClass = 'w-full bg-white border border-brand-line rounded-lg px-4 py-3 focus:outline-none focus:border-brand-leaf text-[15px] text-brand-forest placeholder:text-brand-muted/60 transition-colors';

/**
 * Customer auth page — login + signup + the "forgot password" email + Google,
 * all on Supabase Auth. The recovery link itself is handled on
 * /account/reset-password. Whenever a session starts (signup, sign-in, Google,
 * or an email-confirmation link) AuthContext creates/refreshes the matching
 * `public.customers` row via the admin API, authenticated with the session's
 * access token. Name and phone typed at signup ride in user_metadata so they
 * survive email confirmation; Google supplies full_name and no phone.
 */

export const AuthPage = () => {
  const { user, passwordRecovery, authLinkError, clearAuthLinkError, loading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [password, setPassword] = useState('');
  // A failed email link (expired, already used) lands here with its reason.
  const [error, setError]     = useState(() => authLinkError ?? '');
  const [message, setMessage] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Internal-only redirect target (prevents open-redirect via the query string).
  // Email/password sign-in uses emailPasswordSignInPath (next or redirect, else
  // /account). This fallback stays / so Google and a sign-up confirmation link
  // still land where they did before.
  const redirectParam = params.get('redirect');
  const redirectTo = safeRedirectPath(redirectParam, '/');
  const forgot = params.get('mode') === 'forgot';
  // A used reset link that lands here while this browser is already signed in
  // must keep its message. Leaving for `redirect` used to wipe it.
  const arrivedWithLinkError = useRef(Boolean(authLinkError));
  // Set just before signInWithPassword resolves, so the effect below does not
  // send that sign-in to / when the session arrives.
  const passwordSignInTo = useRef<string | null>(null);
  // Forgot-password and sign-in share this page. Drop a validation error when
  // switching steps so "Enter your email address first." does not follow the
  // shopper back to sign-in. The first render keeps an email-link error.
  const sawForgot = useRef(forgot);
  useEffect(() => {
    if (sawForgot.current === forgot) return;
    sawForgot.current = forgot;
    setError(authLinkError ?? '');
  }, [forgot, authLinkError]);

  // After email confirmation (or if an already-signed-in user opens /auth) we
  // have a session — move them along. A recovery session is not a sign-in:
  // AuthLinkRedirect sends it to /account/reset-password. Leaving before that
  // redirect used to drop the shopper on /. Forgot-password stays put so a
  // signed-in shopper can request a new link.
  useEffect(() => {
    if (authLoading) return;
    if (passwordRecovery) return;
    if (forgot) return;
    if (arrivedWithLinkError.current || authLinkError) return;
    if (user) navigate(passwordSignInTo.current ?? redirectTo, { replace: true });
  }, [authLoading, user, passwordRecovery, forgot, authLinkError, navigate, redirectTo]);

  // The link's message is now on screen; don't show it again on a later visit.
  useEffect(() => {
    if (authLinkError) clearAuthLinkError();
  }, [authLinkError, clearAuthLinkError]);

  // Sign-in mode, with the email they just typed left in the field.
  const showSignIn = () => {
    setIsLogin(true);
    setEmail(email);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      if (isLogin) {
        passwordSignInTo.current = emailPasswordSignInPath(params.toString());
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          passwordSignInTo.current = null;
          throw signInErr;
        }
        navigate(passwordSignInTo.current ?? emailPasswordSignInPath(params.toString()));
      } else {
        // Optional, but when given it must be a real Indian mobile (F49).
        const phoneDigits = phone.trim() ? normaliseIndianMobile(phone) : null;
        if (phone.trim() && !phoneDigits) throw new Error(PHONE_INVALID_MESSAGE);
        if (passwordIsWeak(password)) throw new Error(PASSWORD_WEAK_MESSAGE);
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            // Profile hints only (user-editable, never used for access control).
            data: { name: name || undefined, phone: phoneDigits ?? undefined },
          },
        });
        if (signUpErr) throw signUpErr;

        // New account (confirm email), duplicate (enumeration-protected, empty
        // identities), or neither — see src/lib/signup.ts.
        const outcome = classifySignUp(data);
        if (outcome === 'signed_in') navigate(redirectTo);
        else if (outcome === 'already_registered') {
          // The notice's Sign in, Google, and reset actions use this same email.
          setError(SIGNUP_EXISTS_MESSAGE);
          showSignIn();
        } else if (outcome === 'confirm_email') setMessage(SIGNUP_CONFIRM_MESSAGE);
        else setMessage(SIGNUP_NEUTRAL_MESSAGE);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (resetting) return;
    if (!email) return setError('Enter your email address first.');
    setError(''); setMessage('');
    setResetting(true);
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: passwordResetRedirectTo(window.location.origin),
      });
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (err: any) {
      setError(err?.message ?? 'Could not send reset email.');
    } finally {
      setResetting(false);
    }
  };

  const handleGoogle = async () => {
    setError(''); setMessage(''); setLoading(true);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: googleOAuthRedirectTo(window.location.origin, redirectParam) },
      });
      if (oauthErr) throw oauthErr;
      // The browser is sent to Google; leave the button in a loading state.
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Hold the sign-in form while a recovery session is on its way to the
  // reset page. Showing it, or sending the shopper home, was the old bug.
  if (authLoading) return <AuthPending />;
  if (passwordRecovery) return <AuthPending />;
  if (forgot) {
    return (
      <ForgotPasswordForm
        email={email}
        error={error}
        sent={resetSent}
        submitting={resetting}
        onEmail={setEmail}
        onSubmit={(event) => { event.preventDefault(); void handleReset(); }}
        backHref={user ? '/account' : '/auth'}
        backLabel={user ? 'Your account' : 'Back to sign in'}
      />
    );
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-brand-surface px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full bg-white p-8 sm:p-10 border border-brand-line rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      >
        <img src="/coco36-floral-48.png" srcSet="/coco36-floral-48.png 1x, /coco36-floral-96.png 2x" width={49} height={48} alt="COCO36" className="h-12 w-auto mx-auto mb-5" />

        <p className="eyebrow text-brand-leaf text-center mb-2">{isLogin ? 'Welcome back' : 'Join COCO36'}</p>
        <h1 className="font-display text-4xl text-center text-brand-forest mb-1">
          {isLogin ? 'Sign in' : 'Create account'}
        </h1>
        <p className="text-center text-brand-muted text-sm mb-8">
          {isLogin ? 'Access your orders, addresses and reorders.' : 'Track orders and reorder in one tap.'}
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="btn-ghost w-full !py-3.5 disabled:opacity-50"
        >
          <GoogleMark />
          Continue with Google
        </button>
        <div className="flex items-center gap-3 my-6" role="separator">
          <span className="flex-1 border-t border-brand-line" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-brand-muted">or</span>
          <span className="flex-1 border-t border-brand-line" />
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted block">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={inputClass} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted block">Phone (optional)</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" autoComplete="tel" className={inputClass} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted block">Email address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={`${inputClass} pl-10`} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete={isLogin ? 'current-password' : 'new-password'} aria-describedby={isLogin ? undefined : 'password-hint'} className={`${inputClass} pl-10`} required />
            </div>
            {!isLogin && <p id="password-hint" className="text-xs text-brand-muted">{PASSWORD_HINT}</p>}
          </div>

          {error === SIGNUP_EXISTS_MESSAGE ? (
            <AlreadyRegisteredNotice
              onSignIn={showSignIn}
              onGoogle={handleGoogle}
              onResetPassword={handleReset}
            />
          ) : error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : null}
          {message && <p className="text-brand-leaf text-sm">{message}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 mt-2 disabled:opacity-50">
            {loading ? 'Working…' : isLogin ? 'Sign in' : 'Create account'} <ArrowRight size={15} />
          </button>
        </form>

        <div className="mt-7 flex flex-col items-center gap-3 text-sm">
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }} className="text-brand-forest hover:text-brand-leaf transition-colors">
            {isLogin ? "Don't have an account? Sign up" : 'Already registered? Sign in'}
          </button>
          {isLogin && (
            <button type="button" onClick={handleReset} disabled={resetting} className="text-brand-muted hover:text-brand-leaf transition-colors text-[13px] disabled:opacity-50">
              Forgot password?
            </button>
          )}
          {resetSent ? (
            <p role="status" className="text-brand-forest text-sm text-center">{RESET_LINK_SENT_MESSAGE}</p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};

export function ForgotPasswordForm({
  email,
  error,
  sent,
  submitting,
  onEmail,
  onSubmit,
  backHref,
  backLabel,
}: {
  email: string;
  error: string;
  sent: boolean;
  submitting: boolean;
  onEmail: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-brand-surface px-6 py-12">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 border border-brand-line rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        <img src="/coco36-floral-48.png" srcSet="/coco36-floral-48.png 1x, /coco36-floral-96.png 2x" width={49} height={48} alt="COCO36" className="h-12 w-auto mx-auto mb-5" />
        <p className="eyebrow text-brand-leaf text-center mb-2">Reset password</p>
        <h1 className="font-display text-4xl text-center text-brand-forest mb-1">Reset your password</h1>
        {sent ? (
          <div className="mt-6 space-y-4">
            <p role="status" className="text-center text-brand-forest text-sm">{RESET_LINK_SENT_MESSAGE}</p>
            <button
              type="button"
              disabled={submitting}
              onClick={() => onSubmit({ preventDefault() {} } as FormEvent)}
              className="btn-primary w-full !py-3.5 disabled:opacity-50"
            >
              {submitting ? 'Working…' : 'Send reset link'} <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <>
            <p className="text-center text-brand-muted text-sm mb-8">Enter your email.</p>
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="text-[10px] uppercase tracking-widest font-bold text-brand-muted block">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                  <input id="reset-email" type="email" value={email} onChange={(e) => onEmail(e.target.value)} autoComplete="email" className={`${inputClass} pl-10`} />
                </div>
              </div>
              {error ? <p role="alert" className="text-red-600 text-sm">{error}</p> : null}
              <button type="submit" disabled={submitting} className="btn-primary w-full !py-3.5 mt-2 disabled:opacity-50">
                {submitting ? 'Working…' : 'Send reset link'} <ArrowRight size={15} />
              </button>
            </form>
          </>
        )}
        <Link to={backHref} className="mt-7 block text-center text-sm text-brand-forest hover:text-brand-leaf transition-colors">{backLabel}</Link>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  );
}
