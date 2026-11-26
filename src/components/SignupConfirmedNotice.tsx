import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SIGNUP_CONFIRMED_MESSAGE } from '../lib/signup';

/**
 * One-time "Email confirmed — you're signed in." after a signup-confirmation
 * link lands (src/lib/authLink.ts: signupConfirmed). Rendered app-wide because
 * /auth moves a signed-in shopper straight on to the home page (or their
 * redirect), and Supabase may land the link on the Site URL instead of /auth.
 */
const SHOW_MS = 8000;

export function SignupConfirmedNotice() {
  const { user, loading, signupConfirmed, clearSignupConfirmed } = useAuth();

  useEffect(() => {
    if (!signupConfirmed || loading) return undefined;
    // The link produced no session (used in another tab, storage blocked).
    if (!user) { clearSignupConfirmed(); return undefined; }
    const t = setTimeout(clearSignupConfirmed, SHOW_MS);
    return () => clearTimeout(t);
  }, [signupConfirmed, loading, user, clearSignupConfirmed]);

  if (!signupConfirmed || loading || !user) return null;
  return (
    <div
      role="status"
      data-testid="signup-confirmed"
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full bg-brand-forest text-white text-sm px-5 py-2.5 shadow-lg"
    >
      <span>{SIGNUP_CONFIRMED_MESSAGE}</span>
      <button type="button" onClick={clearSignupConfirmed} aria-label="Dismiss" className="opacity-80 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}
