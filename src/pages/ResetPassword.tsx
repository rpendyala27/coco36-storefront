import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { AuthPending, useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  PASSWORD_HINT,
  PASSWORD_UPDATED_MESSAGE,
  PASSWORD_UPDATED_REDIRECT_MS,
  RESET_LINK_EXPIRED_MESSAGE,
  SEND_NEW_LINK_LABEL,
  passwordUpdateMessage,
  submitNewPassword,
} from '../lib/password';

const inputClass = 'w-full bg-white border border-brand-line rounded-lg px-4 py-3 focus:outline-none focus:border-brand-leaf text-[15px] text-brand-forest placeholder:text-brand-muted/60 transition-colors';

export type ResetPasswordMode = 'form' | 'success' | 'expired';

export function ResetPasswordView({
  mode,
  email,
  password,
  confirm,
  showPassword,
  showConfirm,
  error,
  submitting,
  onPassword,
  onConfirm,
  onTogglePassword,
  onToggleConfirm,
  onSubmit,
}: {
  mode: ResetPasswordMode;
  email: string | null;
  password: string;
  confirm: string;
  showPassword: boolean;
  showConfirm: boolean;
  error: string;
  submitting: boolean;
  onPassword: (value: string) => void;
  onConfirm: (value: string) => void;
  onTogglePassword: () => void;
  onToggleConfirm: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-brand-surface px-6 py-12">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 border border-brand-line rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
        <img src="/coco36-floral-48.png" srcSet="/coco36-floral-48.png 1x, /coco36-floral-96.png 2x" width={49} height={48} alt="COCO36" className="h-12 w-auto mx-auto mb-5" />
        <p className="eyebrow text-brand-leaf text-center mb-2">Reset password</p>

        {mode === 'success' ? (
          <>
            <h1 className="font-display text-4xl text-center text-brand-forest mb-1">Password updated</h1>
            <p role="status" className="text-center text-brand-muted text-sm mb-8">{PASSWORD_UPDATED_MESSAGE} Taking you to your account.</p>
          </>
        ) : mode === 'expired' ? (
          <>
            <h1 className="font-display text-4xl text-center text-brand-forest mb-1">Link expired</h1>
            <p role="alert" className="text-center text-brand-muted text-sm mb-8">{RESET_LINK_EXPIRED_MESSAGE}</p>
            <Link to="/auth" className="btn-primary w-full !py-3.5">{SEND_NEW_LINK_LABEL} <ArrowRight size={15} /></Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl text-center text-brand-forest mb-1">Set a new password</h1>
            <p className="text-center text-brand-muted text-sm mb-8">
              Choose a new password{email ? ` for ${email}` : ''}.
            </p>
            <form onSubmit={onSubmit} noValidate className="space-y-4">
              <PasswordField
                id="new-password"
                label="New password"
                value={password}
                shown={showPassword}
                hintId="new-password-hint"
                invalid={Boolean(error)}
                onChange={onPassword}
                onToggle={onTogglePassword}
              />
              <p id="new-password-hint" className="text-xs text-brand-muted -mt-2">{PASSWORD_HINT}</p>
              <PasswordField
                id="confirm-password"
                label="Confirm password"
                value={confirm}
                shown={showConfirm}
                invalid={Boolean(error)}
                onChange={onConfirm}
                onToggle={onToggleConfirm}
              />
              {error ? <p role="alert" className="text-red-600 text-sm">{error}</p> : null}
              <button type="submit" disabled={submitting} className="btn-primary w-full !py-3.5 mt-2 disabled:opacity-50">
                {submitting ? 'Working…' : 'Update password'} <ArrowRight size={15} />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  shown,
  hintId,
  invalid,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  shown: boolean;
  hintId?: string;
  invalid: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  const action = shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] uppercase tracking-widest font-bold text-brand-muted block">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="new-password"
          aria-describedby={hintId}
          aria-invalid={invalid || undefined}
          className={`${inputClass} pl-10 pr-11`}
          required
        />
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={shown}
          aria-label={action}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-forest"
        >
          {shown ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

/**
 * /account/reset-password — set a new password after a recovery email.
 * With no recovery session (direct visit, expired link, or updateUser
 * reporting the session is gone) the page shows the expired-link state.
 */
export function ResetPasswordPage() {
  const { user, passwordRecovery, clearPasswordRecovery, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!updated) return undefined;
    const t = setTimeout(() => navigate('/account', { replace: true }), PASSWORD_UPDATED_REDIRECT_MS);
    return () => clearTimeout(t);
  }, [updated, navigate]);

  if (loading) return <AuthPending />;

  const mode: ResetPasswordMode = updated
    ? 'success'
    : expired || !(passwordRecovery && user)
      ? 'expired'
      : 'form';

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await submitNewPassword(password, confirm, async (next) => {
        const { error: updErr } = await supabase.auth.updateUser({ password: next });
        return { error: updErr };
      });
      if (result.ok === false) {
        if (result.reason === 'expired') {
          clearPasswordRecovery();
          setExpired(true);
        } else {
          setError(passwordUpdateMessage(result.reason));
        }
        return;
      }
      // Drop the flag before leaving, or the recovery redirect pulls
      // /account straight back here.
      clearPasswordRecovery();
      setUpdated(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResetPasswordView
      mode={mode}
      email={user?.email ?? null}
      password={password}
      confirm={confirm}
      showPassword={showPassword}
      showConfirm={showConfirm}
      error={error}
      submitting={submitting}
      onPassword={setPassword}
      onConfirm={setConfirm}
      onTogglePassword={() => setShowPassword((v) => !v)}
      onToggleConfirm={() => setShowConfirm((v) => !v)}
      onSubmit={handleSubmit}
    />
  );
}
