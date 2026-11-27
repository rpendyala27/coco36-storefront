import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { stayOnPageForAuthLinkError } from '../lib/authLink';
import { RESET_PASSWORD_PATH } from '../lib/password';
import { supabase } from '../lib/supabase';

/**
 * A reset email can land on any page. Supabase sends the shopper to the Site
 * URL (home) when redirectTo is not on the allow-list, and emails sent before
 * this route existed still point at /auth. A recovery session belongs on
 * /account/reset-password, not on / and not on the sign-in form.
 *
 * Recovery is not latched. PASSWORD_RECOVERY can arrive after a first paint
 * that looked like an ordinary sign-in (that paint used to navigate to / and
 * then refuse to leave). A failed link still goes to /auth, unless it already
 * landed on the reset page, which has its own expired-link state.
 *
 * Waits until the client has finished reading tokens out of the URL, so
 * changing the path cannot drop the recovery session.
 */
export function AuthLinkRedirect() {
  const { passwordRecovery, authLinkError, user, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (passwordRecovery) {
      if (pathname === RESET_PASSWORD_PATH) return undefined;
      let live = true;
      void supabase.auth.initialize().then(() => {
        if (!live) return;
        navigate(RESET_PASSWORD_PATH, { replace: true });
      });
      return () => { live = false; };
    }

    if (!authLinkError) return undefined;
    // Wait until we know who is signed in. A used link on / must stay there
    // for a signed-in shopper; sending them to /auth used to bounce them home
    // and drop the message. Signed-out visitors still go to the sign-in form.
    if (loading) return undefined;
    if (stayOnPageForAuthLinkError(pathname, !!user)) return undefined;
    let live = true;
    void supabase.auth.initialize().then(() => {
      if (!live) return;
      navigate('/auth', { replace: true });
    });
    return () => { live = false; };
  }, [passwordRecovery, authLinkError, loading, user, pathname, navigate]);

  return null;
}
