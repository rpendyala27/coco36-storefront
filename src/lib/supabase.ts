import { createClient } from '@supabase/supabase-js';

/**
 * Browser Supabase client for the COCO36 storefront (Vite/Netlify).
 *
 * Reads:
 *   - Products + variants + images (public read via RLS)
 *   - Customer profile + addresses (auth user only)
 *
 * Writes:
 *   - Customer signup/login (Supabase Auth)
 *
 * Order creation does NOT happen here — it goes through the
 * coco36-next Next.js API (`/api/orders/create`) which uses the
 * service role key to insert with tamper-proof pricing.
 */
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** The endpoint that hosts our order-creation API + webhooks. */
export const API_URL = (import.meta.env.VITE_API_URL as string) ?? '';

/** Razorpay client-side key (publishable, not secret). */
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
