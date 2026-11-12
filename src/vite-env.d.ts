/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_RAZORPAY_KEY_ID: string;
  readonly VITE_API_URL: string;
  readonly VITE_SENTRY_DSN?: string;
}

/** Build-time release and environment. Not secrets. Empty when unset. */
declare const __SENTRY_RELEASE__: string | undefined;
declare const __SENTRY_ENVIRONMENT__: string | undefined;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
