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

/**
 * The only public place the registered city is named. /terms only.
 * Street line stays on invoices. Do not reuse this string elsewhere.
 */
export const REGISTERED_OFFICE_LINE =
  'Registered office: Visakhapatnam, Andhra Pradesh 530045, India.';

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

/** Public courier wording. The aggregator is not named on the storefront. */
export const CARRIER       = 'our courier partners';

/**
 * The one dispatch window. There is no admin setting for this yet.
 * A single number today ("2"). Set it to a range ("2–4") later and every
 * dispatch sentence, short label, and the JSON-LD handling max follow.
 * Do not also edit HANDLING_DAYS_MAX: it is derived from this string.
 */
export const DISPATCH_WINDOW = '2';

/** Numeric bounds for structured data. "2" stays min 0 / max 2. "2–4" is min 2 / max 4. */
export function dispatchDayBounds(window: string = DISPATCH_WINDOW): { min: number; max: number } {
  const nums = window.split(/[–-]/).map((part) => Number(part.trim())).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return { min: 0, max: 2 };
  if (nums.length === 1) return { min: 0, max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/** Highest dispatch day, derived from DISPATCH_WINDOW. */
export const HANDLING_DAYS_MAX = dispatchDayBounds().max;

/**
 * Delivery estimates published on /shipping. They are estimates, not
 * guarantees: 3–5 business days to metro cities, up to 10 for remote areas.
 * Product JSON-LD uses that full envelope as transitTime.
 */
export const TRANSIT_DAYS_MIN = 3;
export const TRANSIT_DAYS_MAX = 10;

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
