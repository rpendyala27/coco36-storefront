/**
 * Google Analytics 4 (gtag.js) for the Vite storefront.
 *
 * Two deliberate differences from the stock GA snippet:
 *
 * 1. CONSENT-GATED. The cookie banner offers "Essential only" and its copy
 *    promises no third-party advertising trackers. The stock snippet in
 *    index.html would fire on every visit regardless of that choice, which
 *    makes the banner decorative and the promise untrue. So gtag.js is never
 *    fetched until the visitor has actively accepted — before that, no request
 *    reaches Google at all. Ad storage stays denied even after acceptance.
 *
 * 2. SPA-AWARE. The stock snippet sends exactly one page_view on hard load.
 *    This is a react-router SPA, so every in-app navigation would be invisible
 *    and GA would report one page per session. We send page_view manually on
 *    each route change instead (see trackPageView, wired up in App.tsx).
 *
 * Quiet in local dev — same philosophy as lib/sentry.ts — so localhost traffic
 * never lands in the production property. Set VITE_GA_DEV=true to override.
 */

const MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || 'G-H2E318VXJX';

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: GtagFn;
  }
}

let loaded = false;

/** Prod only, unless explicitly opted in for local debugging. */
const enabled = (): boolean =>
  Boolean(MEASUREMENT_ID) &&
  (import.meta.env.PROD || import.meta.env.VITE_GA_DEV === 'true');

/**
 * The canonical gtag shim. It must push the raw `arguments` object — gtag.js
 * reads the dataLayer entries as Arguments, not as plain arrays.
 */
const gtag: GtagFn = function () {
  (window.dataLayer = window.dataLayer || []).push(arguments);
} as GtagFn;

/** Inject gtag.js exactly once and configure the property. */
function load(): void {
  if (loaded || !enabled() || typeof document === 'undefined') return;
  loaded = true;

  window.gtag = gtag;
  gtag('js', new Date());

  // Consent Mode v2. Analytics is what the visitor agreed to; advertising
  // storage stays denied to match what the cookie banner tells them.
  gtag('consent', 'default', {
    ad_storage:              'denied',
    ad_user_data:            'denied',
    ad_personalization:      'denied',
    analytics_storage:       'granted',
    functionality_storage:   'granted',
    security_storage:        'granted',
  });

  // send_page_view is off because we fire page_view per route ourselves;
  // leaving it on would double-count the first page of every session.
  gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
    anonymize_ip:   true,
  });

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(s);
}

/**
 * Called once at boot (main.tsx). Loads GA only if the visitor already
 * accepted in a previous session; otherwise waits for the banner.
 */
export function initAnalytics(consent: 'accepted' | 'rejected' | null): void {
  if (consent !== 'accepted') return;
  load();
  trackPageView(window.location.pathname + window.location.search);
}

/**
 * Called by the cookie banner when the visitor chooses. On acceptance we load
 * and immediately record the page they accepted on — otherwise their first
 * pageview is lost until they navigate.
 */
export function setAnalyticsConsent(choice: 'accepted' | 'rejected'): void {
  if (choice === 'rejected') {
    // Nothing was loaded, so there is nothing to tear down. If a future change
    // ever loads GA earlier, this still revokes storage rather than no-oping.
    if (loaded) {
      gtag('consent', 'update', {
        ad_storage:        'denied',
        analytics_storage: 'denied',
      });
    }
    return;
  }
  load();
  trackPageView(window.location.pathname + window.location.search);
}

/** Record a pageview. No-ops until consent has loaded GA. */
export function trackPageView(path: string, title?: string): void {
  if (!loaded) return;
  gtag('event', 'page_view', {
    page_path:     path,
    page_title:    title ?? document.title,
    page_location: window.location.href,
  });
}

/** Record a custom event (add_to_cart, begin_checkout, …). No-ops without consent. */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  if (!loaded) return;
  gtag('event', name, params);
}
