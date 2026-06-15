import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
  /** True once a password-recovery link has been opened (Supabase fires the
   *  PASSWORD_RECOVERY event after the reset link lands). The /auth page uses
   *  this to show a "set a new password" form. */
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  passwordRecovery: false,
  clearPasswordRecovery: () => {},
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
  const [passwordRecovery, setPasswordRecovery] = useState(false);

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
      setLoading(false);
      clearTimeout(safety);
      void loadProfile(session?.user ?? null);
    })();

    // Future changes — profile loads in the background, never blocks render.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      // A reset link landing on the site fires PASSWORD_RECOVERY before any
      // navigation; flag it so /auth can show the set-new-password form instead
      // of bouncing the (now session-bearing) user away.
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
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
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, passwordRecovery, clearPasswordRecovery: () => setPasswordRecovery(false), signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
