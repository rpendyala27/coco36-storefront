import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { afterPasswordRecoverySignal } from '../lib/authLink';
import { initialAuthLink, supabase } from '../lib/supabase';
import { createAuthCustomerSync } from '../lib/customerSync';
import { browserStores, clearPerUserStorage } from '../lib/userStorage';

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
   *  src/lib/authLink.ts) and again when PASSWORD_RECOVERY fires, until the
   *  new password is set or the shopper signs out. /account/reset-password
   *  is the only screen that sets a password from this flag. */
  passwordRecovery: boolean;
  clearPasswordRecovery: () => void;
  /** Why an email link that landed here didn't work (expired, already used). */
  authLinkError: string | null;
  clearAuthLinkError: () => void;
  /** A signup-confirmation link just signed the shopper in; show a one-time notice. */
  signupConfirmed: boolean;
  clearSignupConfirmed: () => void;
  /** Re-read the signed-in shopper's customers row (after a profile edit). */
  refreshProfile: () => Promise<void>;
  /** True from the click until sign-out has finished and a late refresh cannot restore the session. */
  signingOut: boolean;
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
  signupConfirmed: false,
  clearSignupConfirmed: () => {},
  refreshProfile: async () => {},
  signingOut: false,
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
  const [signupConfirmed, setSignupConfirmed] = useState(initialAuthLink.signupConfirmed);
  const [signingOut, setSigningOut] = useState(false);
  // A token refresh that finishes during sign-out used to write the session
  // back, so the first click looked like it did nothing.
  const signingOutRef = useRef(false);

  useEffect(() => {
    let active = true;
    // Who is signed in right now. A profile reply for anyone else (it was in
    // flight across a sign-out or an account switch) is dropped.
    let currentUid: string | null = null;

    async function loadProfile(authUser: User | null) {
      currentUid = authUser?.id ?? null;
      if (!authUser) {
        if (active) setProfile(null);
        return;
      }
      const { data } = await supabase
        .from('customers')
        .select('id, name, email, phone, type')
        .eq('id', authUser.id)
        .maybeSingle();

      if (active && currentUid === authUser.id) setProfile((data as CustomerProfile | null) ?? null);
    }

    // Sign-out, or a different account signing in on this browser: drop the
    // previous shopper's checkout drafts and remembered PIN (the cart stays).
    const forgetPreviousShopper = () => {
      const { local, session } = browserStores();
      clearPerUserStorage(local, session);
    };

    // Safety net: never leave `loading` true for more than 3s. Account and
    // checkout wait on this flag; if getSession() stalls they should still
    // resolve instead of spinning forever.
    const safety = setTimeout(() => { if (active) setLoading(false); }, 3000);

    // Initial session — `loading` flips false as soon as we know the auth
    // state. The profile row loads in the background (every page tolerates a
    // null profile). The rest of the tree is not gated on this.
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || signingOutRef.current) return;
      setUser(session?.user ?? null);
      // No session after all (link already consumed in another tab, storage
      // blocked): there is nothing to set a password on.
      if (!session) setPasswordRecovery(false);
      // PASSWORD_RECOVERY is a setTimeout(0) inside supabase-js, queued
      // during getSession(). Yield so that event lands before any page
      // sees loading=false and sends a recovery session to /.
      await afterPasswordRecoverySignal();
      if (!active) return;
      setLoading(false);
      clearTimeout(safety);
      void loadProfile(session?.user ?? null);
    })();

    // Create/refresh the customers row once per signed-in user per tab: on
    // sign-in, on signup without email confirmation, and when an email
    // confirmation link lands with a fresh session. Also on INITIAL_SESSION
    // when the row is missing — a reload does not emit SIGNED_IN, so a
    // navigation that aborted the sign-in read would otherwise never create
    // the row. The admin API takes the user id + email from the access token.
    // Name and phone prefer the saved customers row, then user_metadata
    // (Google full_name, or email sign-up).
    const customerSync = createAuthCustomerSync();

    // Future changes — profile loads in the background, never blocks render.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (signingOutRef.current) {
        setUser(null);
        setProfile(null);
        if (event === 'SIGNED_OUT') {
          setPasswordRecovery(false);
          setSignupConfirmed(false);
          forgetPreviousShopper();
        }
        return;
      }
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        const u = session.user;
        void customerSync.handle(event, session).then(() => {
          if (active && currentUid === u.id) void loadProfile(u);
        }, () => { /* next load, or addAddress, retries the customers row */ });
      }
      // Normally already set from the URL on the first render; kept as a
      // backstop for links the URL check doesn't recognise.
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      // Signing out ends the recovery session; a stale flag here showed a
      // set-password form with no session behind it ("Auth session missing!").
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        setSignupConfirmed(false);
        forgetPreviousShopper();
      } else if (session && currentUid && currentUid !== session.user.id) {
        forgetPreviousShopper();
      }
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
    });

    return () => {
      active = false;
      // Navigation (or unmount) kills an in-flight sign-in read. The next
      // load's INITIAL_SESSION creates the customers row if it is still missing.
      customerSync.abort();
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const authUser = session?.user ?? null;
    if (!authUser) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('customers')
      .select('id, name, email, phone, type')
      .eq('id', authUser.id)
      .maybeSingle();
    const { data: { session: after } } = await supabase.auth.getSession();
    if ((after?.user?.id ?? null) !== authUser.id) return;
    setProfile((data as CustomerProfile | null) ?? null);
  };

  const signOut = async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    setSigningOut(true);
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.auth.signOut();
    } finally {
      setUser(null);
      setProfile(null);
      // Stay closed across the turn a refresh would write the session back.
      setTimeout(() => {
        signingOutRef.current = false;
        setSigningOut(false);
      }, 400);
    }
  };

  // Admin role: for now we treat all signed-in customers as non-admin on the
  // storefront. The actual admin panel lives on coco36-next.vercel.app and
  // uses a separate Supabase admin login flow.
  const isAdmin = false;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, passwordRecovery, clearPasswordRecovery: () => setPasswordRecovery(false), authLinkError, clearAuthLinkError: () => setAuthLinkError(null), signupConfirmed, clearSignupConfirmed: () => setSignupConfirmed(false), refreshProfile, signingOut, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

/** Shown on account and checkout while the session is still being read, so a
 *  signed-in shopper is not sent to /auth. */
export function AuthPending() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center pt-20 bg-brand-paper">
      <p className="text-sm text-brand-muted">Loading…</p>
    </div>
  );
}
