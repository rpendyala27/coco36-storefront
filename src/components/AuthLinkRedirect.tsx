import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

/**
 * A reset or confirmation email link can land on any page: Supabase sends the
 * shopper to the Site URL (the home page) when the link's redirect isn't on its
 * allow-list. Move them to /auth, which shows the set-new-password form or what
 * went wrong with the link.
 *
 * Only on landing: once they're on /auth they can browse away freely.
 * Waits for the Supabase client to finish reading the tokens out of the URL,
 * so changing the URL can't drop the recovery session.
 */
export function AuthLinkRedirect() {
  const { passwordRecovery, authLinkError } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || (!passwordRecovery && !authLinkError)) return;
    if (pathname === '/auth') { handled.current = true; return; }
    let live = true;
    void supabase.auth.initialize().then(() => {
      if (!live || handled.current) return;
      handled.current = true;
      navigate('/auth', { replace: true });
    });
    return () => { live = false; };
  }, [passwordRecovery, authLinkError, pathname, navigate]);

  return null;
}
