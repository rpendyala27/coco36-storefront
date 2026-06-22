import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase, API_URL } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

/**
 * Customer auth page — login + signup + password reset, all on Supabase Auth.
 * After signup we create a matching row in `public.customers` via the
 * Next.js admin API (service role bypasses RLS).
 */
export const AuthPage = () => {
  const { user, passwordRecovery, clearPasswordRecovery } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError]     = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Internal-only redirect target (prevents open-redirect via the query string).
  const redirectParam = params.get('redirect');
  const redirectTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/';

  // After email confirmation (or if an already-signed-in user opens /auth) we
  // have a session — move them along. EXCEPT mid password-recovery, where we
  // want to keep them here to set a new password.
  useEffect(() => {
    if (user && !passwordRecovery) navigate(redirectTo, { replace: true });
  }, [user, passwordRecovery, navigate, redirectTo]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      if (isLogin) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        navigate(redirectTo);
      } else {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (signUpErr) throw signUpErr;

        // Email-enumeration protection: a duplicate signup returns NO error and
        // NO session — and on this supabase-js version, a null `user` as well
        // (a genuine new signup always returns data.user). So a null user here
        // means the email is already registered. Show that instead of the
        // misleading "check your email to confirm".
        if (!data.user && !data.session) {
          setError('An account with this email already exists — please sign in below.');
          setIsLogin(true);
          return;
        }

        if (data.user) {
          try {
            await fetch(`${API_URL}/api/customers/signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ authUserId: data.user.id, name: name || email.split('@')[0], email, phone: phone || undefined }),
            });
          } catch { /* non-fatal */ }
        }
        if (data.session) navigate(redirectTo);
        else setMessage('Check your email to confirm your account.');
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) return setError('Enter your email address first.');
    setError(''); setMessage('');
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
      if (resetErr) throw resetErr;
      setMessage('Reset link sent to your email.');
    } catch (err: any) {
      setError(err?.message ?? 'Could not send reset email.');
    }
  };

  // Set a new password after a recovery link landed (PASSWORD_RECOVERY gives us
  // a short-lived authenticated session; updateUser sets the new password).
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updErr) throw updErr;
      clearPasswordRecovery();
      navigate(redirectTo, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Could not update your password.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-white border border-brand-line rounded-lg px-4 py-3 focus:outline-none focus:border-brand-primary text-[15px] text-brand-deep placeholder:text-brand-muted/60 transition-colors';

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-brand-surface px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-md w-full bg-white p-8 sm:p-10 border border-brand-line rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
      >
        <img src="/coco36-floral.png" alt="COCO36" className="h-12 w-auto mx-auto mb-5" />

        {passwordRecovery ? (
          /* ── Set a new password (lands here from the reset email link) ───── */
          <>
            <p className="eyebrow text-brand-primary text-center mb-2">Reset password</p>
            <h1 className="font-serif text-4xl text-center text-brand-deep mb-1">Set a new password</h1>
            <p className="text-center text-brand-muted text-sm mb-8">Choose a new password for your account.</p>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest font-bold text-brand-muted block">New password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" className={`${inputClass} pl-10`} required />
                </div>
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              {message && <p className="text-brand-primary text-sm">{message}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 mt-2 disabled:opacity-50">
                {loading ? 'Working…' : 'Update password'} <ArrowRight size={15} />
              </button>
            </form>
          </>
        ) : (
        <>
        <p className="eyebrow text-brand-primary text-center mb-2">{isLogin ? 'Welcome back' : 'Join COCO36'}</p>
        <h1 className="font-serif text-4xl text-center text-brand-deep mb-1">
          {isLogin ? 'Sign in' : 'Create account'}
        </h1>
        <p className="text-center text-brand-muted text-sm mb-8">
          {isLogin ? 'Access your orders, addresses and reorders.' : 'Track orders and reorder in one tap.'}
        </p>

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
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete={isLogin ? 'current-password' : 'new-password'} className={`${inputClass} pl-10`} required />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-brand-primary text-sm">{message}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full !py-3.5 mt-2 disabled:opacity-50">
            {loading ? 'Working…' : isLogin ? 'Sign in' : 'Create account'} <ArrowRight size={15} />
          </button>
        </form>

        <div className="mt-7 flex flex-col items-center gap-3 text-sm">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }} className="text-brand-deep hover:text-brand-primary transition-colors">
            {isLogin ? "Don't have an account? Sign up" : 'Already registered? Sign in'}
          </button>
          {isLogin && (
            <button onClick={handleReset} className="text-brand-muted hover:text-brand-primary transition-colors text-[13px]">
              Forgot password?
            </button>
          )}
        </div>
        </>
        )}
      </motion.div>
    </div>
  );
};
