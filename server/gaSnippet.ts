import { readGaIdEnv } from '../src/lib/gaId.js';

/**
 * The gtag snippet for the server-rendered <head>.
 *
 * Every HTML document from api/render goes through this, including 404 and
 * /terms. Redirect bodies do not. The loader is async so it does not block
 * first paint. The inline bootstrap is a few lines; gtag.js itself is the
 * async script.
 *
 * Consent defaults stay denied. This is not Consent Mode advanced: there is
 * no wait_for_update, so the snippet does not schedule a cookieless ping
 * before the visitor chooses. The cookie banner grants analytics_storage
 * only after Accept (src/lib/analytics.ts). Ad storage stays denied.
 * send_page_view is false so the config call does not emit a hit that
 * App.tsx would then emit again on the same route.
 *
 * Emitted only when NODE_ENV is production and the id is non-empty, so
 * `vite dev`, vitest, and an explicit empty VITE_GA_ID stay quiet.
 */

export function gaHeadForEnv(env: NodeJS.ProcessEnv = process.env): string {
  if (env.NODE_ENV !== 'production') return '';
  const id = readGaIdEnv(env);
  if (!id) return '';
  return renderGaHead(id);
}

export function renderGaHead(id: string): string {
  return [
    '    <script async src="https://www.googletagmanager.com/gtag/js?id=' + id + '"></script>',
    '    <script>',
    '      window.dataLayer = window.dataLayer || [];',
    '      function gtag(){dataLayer.push(arguments);}',
    '      window.gtag = gtag;',
    "      gtag('js', new Date());",
    "      gtag('consent', 'default', {",
    "        ad_storage: 'denied',",
    "        ad_user_data: 'denied',",
    "        ad_personalization: 'denied',",
    "        analytics_storage: 'denied',",
    "        functionality_storage: 'granted',",
    "        security_storage: 'granted'",
    '      });',
    "      gtag('config', '" + id + "', { send_page_view: false, anonymize_ip: true });",
    '    </script>',
  ].join('\n');
}
