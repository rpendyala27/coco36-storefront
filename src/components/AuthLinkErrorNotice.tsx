import { X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * A used reset link that lands on / while this browser is already signed in
 * used to be sent to /auth and then straight home, so the error never painted.
 * /auth shows the same message on the form and does not leave.
 */
export function AuthLinkErrorNotice() {
  const { user, loading, authLinkError, clearAuthLinkError } = useAuth();
  const { pathname } = useLocation();
  if (loading || !user || pathname !== '/' || !authLinkError) return null;
  return (
    <div
      role="alert"
      data-testid="auth-link-error"
      className="fixed top-20 left-1/2 z-50 flex w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 items-start gap-3 rounded-xl bg-white px-5 py-3 text-sm text-brand-ink shadow-lg ring-1 ring-black/10"
    >
      <p className="flex-1">{authLinkError}</p>
      <button type="button" onClick={clearAuthLinkError} aria-label="Dismiss" className="opacity-70 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}
