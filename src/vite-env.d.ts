/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_RAZORPAY_KEY_ID: string;
  readonly VITE_API_URL: string;
  readonly VITE_SENTRY_DSN?: string;
  /** GA4 measurement id. Unset uses the built-in default. Empty disables the tag. */
  readonly VITE_GA_ID?: string;
  /** Older name for VITE_GA_ID. Used only when VITE_GA_ID is unset. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Set to "true" to load GA from `vite dev`. Off otherwise. */
  readonly VITE_GA_DEV?: string;
}

/** Build-time release and environment. Not secrets. Empty when unset. */
declare const __SENTRY_RELEASE__: string | undefined;
declare const __SENTRY_ENVIRONMENT__: string | undefined;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
