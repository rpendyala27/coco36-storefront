import { Analytics } from '@vercel/analytics/react';

/**
 * Vercel Web Analytics for the storefront.
 *
 * Cookieless page views only. Not gated on the cookie banner, and it does
 * not receive email, phone, name, or address. Production builds only: `vite
 * dev` and tests leave it unmounted, so the debug script never loads.
 *
 * `<Analytics />` renders null and injects `/_vercel/insights/script.js`
 * from a mount effect. The server HTML snapshot is not React output, and
 * the first client render is empty, so there is nothing to mismatch.
 * Speed Insights and custom Vercel events are not used.
 */
export function StorefrontAnalytics() {
  if (!import.meta.env.PROD) return null;
  return <Analytics />;
}
