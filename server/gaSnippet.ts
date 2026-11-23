/**
 * Consent default for the server-rendered <head>.
 *
 * This does not load gtag.js and does not name googletagmanager.com.
 * The library is injected only after Allow analytics (src/lib/analytics.ts).
 * The inline stub records Consent Mode as denied so a later load cannot
 * treat the first hit as already granted. Ad storage stays denied.
 *
 * Omitted outside production, and when the measurement id is explicitly
 * empty or not a GA4 id, so dev, tests, and a disabled property stay quiet.
 */

import { readGaIdEnv } from '../src/lib/gaId.js';

export function gaHeadForEnv(env: NodeJS.ProcessEnv = process.env): string {
  if (env.NODE_ENV !== 'production') return '';
  if (!readGaIdEnv(env)) return '';
  return renderConsentDefault();
}

/** No script src. Nothing here is a request to Google. */
export function renderConsentDefault(): string {
  return [
    '    <script>',
    '      window.dataLayer = window.dataLayer || [];',
    '      function gtag(){dataLayer.push(arguments);}',
    '      window.gtag = gtag;',
    "      gtag('consent', 'default', {",
    "        ad_storage: 'denied',",
    "        ad_user_data: 'denied',",
    "        ad_personalization: 'denied',",
    "        analytics_storage: 'denied',",
    "        functionality_storage: 'granted',",
    "        security_storage: 'granted'",
    '      });',
    '    </script>',
  ].join('\n');
}
