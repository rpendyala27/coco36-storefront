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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
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

    // Initial session
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      setUser(session?.user ?? null);
      await loadProfile(session?.user ?? null);
      if (active) setLoading(false);
    })();

    // Future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      await loadProfile(session?.user ?? null);
    });

    return () => {
      active = false;
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
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
