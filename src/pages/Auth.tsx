import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react';
import { supabase, API_URL } from '../lib/supabase';

/**
 * Customer auth page — login + signup + password reset, all on Supabase Auth.
 *
 * After signup we create a matching row in `public.customers` via the
 * Next.js admin API (uses the service role key on the server to bypass RLS).
 */
export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [phone, setPhone]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) throw signInErr;
        navigate('/');
      } else {
        // Signup
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });
        if (signUpErr) throw signUpErr;

        // Create matching customers row (best-effort — non-blocking)
        if (data.user) {
          try {
            await fetch(`${API_URL}/api/customers/signup`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                authUserId: data.user.id,
                name: name || email.split('@')[0],
                email,
                phone: phone || undefined,
              }),
            });
          } catch {
            // Non-fatal: customers row can be created lazily later
          }
        }

        if (data.session) {
          // Email confirmation disabled — user is signed in immediately
          navigate('/');
        } else {
          setMessage('Check your email to confirm your account.');
        }
      }
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) return setError('Enter your email address first.');
    setError('');
    setMessage('');
    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (resetErr) throw resetErr;
      setMessage('Reset link sent to your email.');
    } catch (err: any) {
      setError(err?.message ?? 'Could not send reset email.');
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-brand-paper px-6">
      <div className="bg-noise" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-md w-full bg-brand-paper p-10 border border-brand-ink/10 relative z-10 shadow-lg"
      >
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Shield size={28} strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-4xl text-center mb-2">
          {isLogin ? 'Access Portal' : 'Enrollment'}
        </h2>
        <p className="text-center text-brand-ink/40 text-[10px] uppercase tracking-widest mb-12">
          {isLogin ? 'Enter your credentials' : 'Join the ethical collective'}
        </p>

        <form onSubmit={handleAuth} className="space-y-6">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 block">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent border-b border-brand-ink/20 py-4 focus:outline-none focus:border-brand-primary text-lg placeholder:font-serif placeholder:italic transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 block">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 …"
                  className="w-full bg-transparent border-b border-brand-ink/20 py-4 focus:outline-none focus:border-brand-primary text-lg placeholder:font-serif placeholder:italic transition-all"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-0 top-1/2 -translate-y-1/2 opacity-20" size={15} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-b border-brand-ink/20 py-4 pl-7 focus:outline-none focus:border-brand-primary text-lg placeholder:font-serif placeholder:italic transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest font-bold opacity-50 block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-0 top-1/2 -translate-y-1/2 opacity-20" size={15} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                className="w-full bg-transparent border-b border-brand-ink/20 py-4 pl-7 focus:outline-none focus:border-brand-primary text-lg placeholder:font-serif placeholder:italic transition-all"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-[11px] uppercase tracking-widest">{error}</p>
          )}
          {message && (
            <p className="text-green-600 text-[11px] uppercase tracking-widest">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-brand-ink text-brand-paper text-[11px] uppercase tracking-widest font-bold flex items-center justify-center gap-4 hover:bg-brand-primary transition-all duration-500 mt-8 disabled:opacity-50"
          >
            {loading ? 'Working…' : isLogin ? 'Login' : 'Create Account'} <ArrowRight size={14} />
          </button>
        </form>

        <div className="mt-8 flex flex-col items-center gap-4 text-[10px] uppercase tracking-widest font-bold opacity-50">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
            className="hover:opacity-100 transition-opacity"
          >
            {isLogin ? "Don't have an account? Enroll" : 'Already registered? Login'}
          </button>
          {isLogin && (
            <button onClick={handleReset} className="opacity-40 hover:opacity-100 transition-opacity">
              Forgot Password?
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
