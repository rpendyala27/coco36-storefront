import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { initialAuthLink, supabase } from '../lib/supabase';
import { syncCustomerProfile } from '../lib/apiAuth';

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  type: 'b2c' | 'b2b';
}

interface AuthContextType {
  user: User | null;
  profile: CustomerProfile | null;
  loading: boolean;
  isAdmin: boolean;
  /** True while a password-recovery link's session is in use: from the first
   *  render after the reset link lands (read from the URL, see
   *  src/lib/authLink.ts) until the new password is set or the shopper signs
   *  out. The /auth page uses this to show the "set a new password" form. */
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  /** Why an email link that landed here didn't work (expired, already used). */
  authLinkError: string | null;
  clearAuthLinkError: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  passwordRecovery: false,
  clearPasswordRecovery: () => {},
  authLinkError: null,
  clearAuthLinkError: () => {},
  signOut: async () => {},
});

/**
 * Auth provider — bridges Supabase Auth to the rest of the app.
 *
 * Subscribes to onAuthStateChange so login / logout / token-refresh
 * propagate without a full page reload. On every change we (re)load
 * the matching `customers` row so the UI has profile data.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Known on the first render: waiting for the PASSWORD_RECOVERY event let
  // /auth see a signed-in user first and send them to the home page.
  const [passwordRecovery, setPasswordRecovery] = useState(initialAuthLink.recovery);
  const [authLinkError, setAuthLinkError] = useState<string | null>(initialAuthLink.error);

  useEffect(() => {
    let active = true;

    async function loadProfile(authUser: User | null) {
      if (!authUser) {
        if (active) setProfile(null);
        return;
      }
      const { data } = await supabase
        .from('customers')
        .select('id, name, email, phone, type')
        .eq('id', authUser.id)
        .maybeSingle();

      if (active) setProfile((data as CustomerProfile | null) ?? null);
    }

    // Safety net: never gate the whole app on auth for more than 3s. If
    // getSession() stalls (e.g. a slow token refresh on a returning session),
    // we still render the shell instead of showing a blank page.
    const safety = setTimeout(() => { if (active) setLoading(false); }, 3000);

    // Initial session — render as soon as we know the auth state; the profile
    // row loads in the background (every page tolerates a null profile).
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setUser(session?.user ?? null);
      // No session after all (link already consumed in another tab, storage
      // blocked): there is nothing to set a password on.
      if (!session) setPasswordRecovery(false);
      setLoading(false);
      clearTimeout(safety);
      void loadProfile(session?.user ?? null);
    })();

    // Create/refresh the customers row once per signed-in user per tab: on
    // sign-in, on signup without email confirmation, and when an email
    // confirmation link lands with a fresh session. The admin API takes the
    // user id + email from the access token; name/phone come from user_metadata.
    let syncedFor: string | null = null;

    // Future changes — profile loads in the background, never blocks render.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_IN' && session && syncedFor !== session.user.id) {
        syncedFor = session.user.id;
        const u = session.user;
        void syncCustomerProfile(session.access_token).then(() => { if (active) void loadProfile(u); });
      }
      // Normally already set from the URL on the first render; kept as a
      // backstop for links the URL check doesn't recognise.
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      // Signing out ends the recovery session; a stale flag here showed a
      // set-password form with no session behind it ("Auth session missing!").
      if (event === 'SIGNED_OUT') setPasswordRecovery(false);
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
    });

    return () => {
      active = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Admin role: for now we treat all signed-in customers as non-admin on the
  // storefront. The actual admin panel lives on coco36-next.vercel.app and
  // uses a separate Supabase admin login flow.
  const isAdmin = false;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, passwordRecovery, clearPasswordRecovery: () => setPasswordRecovery(false), authLinkError, clearAuthLinkError: () => setAuthLinkError(null), signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
