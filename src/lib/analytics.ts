/**
 * Google Analytics 4 (gtag.js) for the Vite storefront.
 *
 * The async loader itself is in the server-rendered <head> (server/gaSnippet.ts)
 * on production HTML, including 404 and static pages. This module does not
 * inject a second copy of that script. It only turns collection on after the
 * cookie banner's Accept, and it records SPA navigations.
 *
 * 1. CONSENT-GATED HITS. The banner offers "Essential only" and says
 *    analytics is part of Accept, not of the essential set. The head snippet
 *    starts Consent Mode with analytics_storage denied (ad storage stays
 *    denied either way). The browser does fetch gtag.js, because the tag is
 *    in the HTML. Until Accept, trackPageView is a no-op, so route hits are
 *    not sent. Granting consent is what lets those page views out.
 *
 * 2. SPA-AWARE, WITHOUT DOUBLE COUNTING. gtag config uses send_page_view:
 *    false, so the initial config does not emit a page_view. App.tsx calls
 *    trackPageView on each route change (including the landing route and
 *    query-string changes). We do not also listen for history events here;
 *    that would count the same navigation twice. Enhanced measurement
 *    "browser history" in the GA4 property is a separate switch in the GA
 *    admin and is not turned on by this code.
 *
 * Quiet in local dev — same philosophy as lib/sentry.ts — so localhost traffic
 * never lands in the production property. Set VITE_GA_DEV=true to override.
 * An explicit empty VITE_GA_ID disables the tag. The dev server does not run
 * the SSR injector, so in dev this module is the only loader, and only when
 * VITE_GA_DEV=true.
 */

import {
  type GaLine,
  addToCartParams,
  beginCheckoutParams,
  purchaseParams,
  purchaseStorageKey,
  viewItemParams,
} from './gaCommerce';
import { readGaIdEnv } from './gaId';

function clientGaEnv(): { VITE_GA_ID?: string; VITE_GA_MEASUREMENT_ID?: string } {
  const env: { VITE_GA_ID?: string; VITE_GA_MEASUREMENT_ID?: string } = {};
  const id = import.meta.env.VITE_GA_ID as string | undefined;
  const legacy = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (id !== undefined) env.VITE_GA_ID = id;
  if (legacy !== undefined) env.VITE_GA_MEASUREMENT_ID = legacy;
  return env;
}

const MEASUREMENT_ID = readGaIdEnv(clientGaEnv());

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: GtagFn;
  }
}

let loaded = false;

/** Orders already sent as `purchase` this tab. sessionStorage covers a refresh. */
const purchaseMemory = new Set<string>();

/** Prod only, unless explicitly opted in for local debugging. */
const enabled = (): boolean =>
  MEASUREMENT_ID !== null &&
  (import.meta.env.PROD || import.meta.env.VITE_GA_DEV === 'true');

const GTAG_SRC = 'www.googletagmanager.com/gtag/js';

function snippetPresent(): boolean {
  return !!document.querySelector(`script[src*="${GTAG_SRC}"]`);
}

/**
 * The canonical gtag shim. It must push the raw `arguments` object — gtag.js
 * reads the dataLayer entries as Arguments, not as plain arrays.
 */
const gtag: GtagFn = function () {
  (window.dataLayer = window.dataLayer || []).push(arguments);
} as GtagFn;

/** Configure gtag once consent is granted, and fetch gtag.js if the SSR head
 *  did not already include it (local dev with VITE_GA_DEV). */
function load(): void {
  if (loaded || !enabled() || typeof document === 'undefined' || !MEASUREMENT_ID) return;
  loaded = true;

  const fromHead = typeof window.gtag === 'function' || snippetPresent();
  if (!window.gtag) window.gtag = gtag;

  if (fromHead) {
    // The head snippet already pushed consent default (denied) and config
    // with send_page_view false. Update consent only — a second config would
    // be a second page_view if send_page_view were ever left on.
    window.gtag('consent', 'update', {
      ad_storage:         'denied',
      ad_user_data:       'denied',
      ad_personalization: 'denied',
      analytics_storage:  'granted',
    });
  } else {
    gtag('js', new Date());
    gtag('consent', 'default', {
      ad_storage:            'denied',
      ad_user_data:          'denied',
      ad_personalization:    'denied',
      analytics_storage:     'granted',
      functionality_storage: 'granted',
      security_storage:      'granted',
    });
    gtag('config', MEASUREMENT_ID, {
      send_page_view: false,
      anonymize_ip:   true,
    });
  }

  if (!snippetPresent()) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    document.head.appendChild(s);
  }
}

/**
 * Called once at boot (main.tsx). Loads GA only if the visitor already
 * accepted in a previous session; otherwise waits for the banner. No pageview
 * here: App.tsx's route effect fires on mount and records the landing page.
 */
export function initAnalytics(consent: 'accepted' | 'rejected' | null): void {
  if (consent !== 'accepted') return;
  load();
}

/**
 * Called by the cookie banner when the visitor chooses. On acceptance we load
 * and immediately record the page they accepted on — otherwise their first
 * pageview is lost until they navigate.
 */
export function setAnalyticsConsent(choice: 'accepted' | 'rejected'): void {
  if (choice === 'rejected') {
    // The head snippet may already have installed gtag with storage denied.
    // Say so again so a later grant in this tab cannot be assumed.
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage:         'denied',
        ad_user_data:       'denied',
        ad_personalization: 'denied',
        analytics_storage:  'denied',
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

function sendCommerce(name: string, params: Record<string, unknown> | null): void {
  if (!loaded || !params) return;
  gtag('event', name, params);
}

/** Product page. No-op until Accept, and when the pack has no SKU. */
export function trackViewItem(line: GaLine): void {
  sendCommerce('view_item', viewItemParams(line));
}

/** Quantity is the number of packs just added, not the new cart total. */
export function trackAddToCart(line: GaLine): void {
  sendCommerce('add_to_cart', addToCartParams(line));
}

/** Once per checkout visit. `subtotalPaise` is the sellable cart total. */
export function trackBeginCheckout(lines: readonly GaLine[], subtotalPaise: number): void {
  sendCommerce('begin_checkout', beginCheckoutParams(lines, subtotalPaise));
}

function purchaseAlreadySent(orderNumber: string): boolean {
  if (purchaseMemory.has(orderNumber)) return true;
  try {
    return window.sessionStorage.getItem(purchaseStorageKey(orderNumber)) === '1';
  } catch {
    return false;
  }
}

function rememberPurchase(orderNumber: string): void {
  purchaseMemory.add(orderNumber);
  try {
    window.sessionStorage.setItem(purchaseStorageKey(orderNumber), '1');
  } catch {
    /* Private mode: the in-memory set still stops a second call this tab. */
  }
}

/**
 * Razorpay success only. No-op until Accept, and a second call for the same
 * order number (refresh, revisit, or a double handler) does not send again.
 * The payload is transaction id, value in rupees, INR, and item rows. No
 * email, phone, name, or address.
 */
export function trackPurchase(order: { orderNumber: string; totalPaise: number; lines: readonly GaLine[] }): void {
  if (!loaded) return;
  const orderNumber = order.orderNumber.trim();
  if (!orderNumber) return;
  if (purchaseAlreadySent(orderNumber)) return;
  const params = purchaseParams({ ...order, orderNumber });
  if (!params) return;
  rememberPurchase(orderNumber);
  gtag('event', 'purchase', params);
}

/** Test hook. Production code does not call this. */
export function resetAnalyticsForTests(): void {
  loaded = false;
  purchaseMemory.clear();
}
