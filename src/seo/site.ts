/**
 * Site-wide facts used in meta tags, JSON-LD and the server-rendered snapshot.
 * Pure constants — shared by the Vite app and the Vercel render function.
 *
 * Everything here should be something COCO36 can stand behind. Business facts
 * mirror the admin `settings` table (seller.*, shipping.*, returns.*).
 */

/** The ONE canonical origin. www and http both 301 here (see vercel.json). */
export const SITE_ORIGIN = 'https://coco36.com';
export const SITE_HOST   = 'coco36.com';

export const BRAND       = 'COCO36';
export const LEGAL_NAME  = 'COCO36 Foods Pvt Ltd';
export const LOGO_URL    = `${SITE_ORIGIN}/coco36-floral.png`;   // 256×250
export const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og.png`;          // 1200×630

/** settings.seller.* — city/state/pincode only; the street line stays on invoices. */
export const ORG_ADDRESS = {
  addressLocality: 'Visakhapatnam',
  addressRegion:   'Andhra Pradesh',
  postalCode:      '530045',
  addressCountry:  'IN',
} as const;

/**
 * Official social profiles: Organization.sameAs + the footer links.
 * Canonical profile URLs only — no share/tracking params, no /share/ redirect
 * links (they can expire and aren't the profile's address).
 * TODO(owner): add YouTube once live.
 */
export const SOCIAL_LINKS: readonly { label: string; url: string }[] = [
  { label: 'Instagram', url: 'https://www.instagram.com/coco36official/' },
  { label: 'Facebook',  url: 'https://www.facebook.com/profile.php?id=61580777662218' },
];
export const SOCIAL_PROFILES: readonly string[] = SOCIAL_LINKS.map((s) => s.url);

/** Shipping carrier + dispatch point, used in visible copy. */
export const SHIPS_FROM    = 'Visakhapatnam, Andhra Pradesh';
export const CARRIER       = 'Shiprocket';
/** "Ships in 2 business days" — the dispatch promise shown on every PDP. */
export const HANDLING_DAYS_MAX = 2;

/**
 * Store policy defaults = the live `settings` values. The storefront refreshes
 * them from the admin API (lib/storeConfig) and the render function reads the
 * `settings` table, so these only matter if both of those fail.
 */
export interface StorePolicy {
  freeShippingPaise: number;   // shipping.free_threshold_paise
  flatShippingPaise: number;   // shipping.standard_fee_paise
  codSurchargePaise: number;   // shipping.cod_extra_paise
  returnWindowDays:  number;   // returns.window_days
}

export const DEFAULT_POLICY: StorePolicy = {
  freeShippingPaise: 120000, // ₹1,200
  flatShippingPaise: 9900,   // ₹99
  codSurchargePaise: 5000,   // ₹50
  returnWindowDays:  7,
};

/** ₹ amount for copy: 120000 → "₹1,200". */
export function rupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

/** Absolute URL on the canonical origin. */
export function absUrl(path: string): string {
  return path.startsWith('http') ? path : `${SITE_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
