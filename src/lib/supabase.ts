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
const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Whether real credentials were supplied at build time.
 *
 * Callers use this to skip doomed requests. `main.tsx` uses it to refuse to
 * boot a production build without credentials — see the note below.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Missing env vars — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
    'in .env.local (copy .env.example). The catalogue falls back to the static ' +
    'demo data in src/data/products.ts; auth and checkout will not work.',
  );
}

/**
 * createClient() THROWS on an empty url ("supabaseUrl is required"), and this
 * module is imported by AuthContext, which main.tsx mounts above everything.
 * An unconfigured build therefore used to die during module evaluation — React
 * never mounted and the #app-boot spinner in index.html span forever, with no
 * error visible to anyone but a developer with the console open.
 *
 * So when credentials are absent we hand createClient a syntactically valid
 * placeholder instead. Nothing throws, the real client interface is preserved
 * exactly (no hand-written stub to drift out of sync), and the app boots far
 * enough for the fallbacks that already exist downstream to do their job.
 */
const PLACEHOLDER_URL = 'https://unconfigured.invalid';

export const supabase = createClient(
  supabaseUrl || PLACEHOLDER_URL,
  supabaseAnonKey || 'unconfigured-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

/** The endpoint that hosts our order-creation API + webhooks. */
export const API_URL = (import.meta.env.VITE_API_URL as string) ?? '';

/** Razorpay client-side key (publishable, not secret). */
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID as string;
