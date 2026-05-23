/**
 * COCO36 currency module.
 *
 * Single source of truth for money formatting across the storefront.
 *
 * Canonical type: **paise** (1 INR = 100 paise). Stored as plain `number`
 * (JS-safe up to 2^53 paise — far beyond any realistic order total).
 *
 * Today: INR only.
 * Tomorrow: routes through `getActiveCurrency()` so we can switch on
 *           user locale (geo-IP, browser language, or explicit picker)
 *           without touching every callsite.
 */

// ── Currency catalogue ───────────────────────────────────────────────────────
// Each entry knows how to render one INR paise as its local representation.
// `rateFromINR` = how many units of this currency equal 1 INR.
// `symbol` is prefixed; `locale` is passed to `Intl.NumberFormat`.

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  rateFromINR: number;        // 1 INR = rateFromINR <CODE>
  fractionDigits: number;     // typical decimal places for display
}

const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', locale: 'en-IN', rateFromINR: 1,         fractionDigits: 0 },
  USD: { code: 'USD', symbol: '$', locale: 'en-US', rateFromINR: 0.012,     fractionDigits: 2 },
  EUR: { code: 'EUR', symbol: '€', locale: 'de-DE', rateFromINR: 0.011,     fractionDigits: 2 },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB', rateFromINR: 0.0095,    fractionDigits: 2 },
  AED: { code: 'AED', symbol: 'د.إ ', locale: 'ar-AE', rateFromINR: 0.044, fractionDigits: 2 },
  SGD: { code: 'SGD', symbol: 'S$', locale: 'en-SG', rateFromINR: 0.016,    fractionDigits: 2 },
};

// ── Active currency (placeholder for future locale detection) ────────────────
//
// For now we hard-code INR. Future enhancements:
//   • Detect via `Intl.DateTimeFormat().resolvedOptions().timeZone`
//   • Geo-IP lookup at server edge
//   • User-selected from a header dropdown
//   • Remember in localStorage / cookie
//
// Until any of those land, `getActiveCurrency()` always returns INR and
// the rest of the app is currency-agnostic by design.

let activeCurrency: CurrencyCode = 'INR';

export function getActiveCurrency(): CurrencyCode {
  return activeCurrency;
}

/** Override the active currency. Today this is a no-op preserved for future use. */
export function setActiveCurrency(code: CurrencyCode): void {
  if (CURRENCIES[code]) activeCurrency = code;
}

/**
 * PLACEHOLDER — future entrypoint for locale-based currency detection.
 *
 * Today: always returns 'INR'.
 * Tomorrow: replace this implementation to switch on user locale.
 *
 * Example future impl:
 *   const country = await fetchUserCountry();   // geo-IP at edge
 *   return COUNTRY_TO_CURRENCY[country] ?? 'INR';
 */
export function detectUserCurrency(): CurrencyCode {
  return 'INR';
}

// ── Formatters ───────────────────────────────────────────────────────────────

/**
 * Format paise as a localized money string.
 *
 *   formatMoney(315400)              → '₹3,154'
 *   formatMoney(315400, { code: 'USD' }) → '$37.85'
 *
 * @param paise   amount in INR paise (canonical type)
 * @param options.code  override target currency (defaults to active)
 */
export function formatMoney(
  paise: number,
  options: { code?: CurrencyCode } = {},
): string {
  const code   = options.code ?? activeCurrency;
  const config = CURRENCIES[code];
  const inr    = paise / 100;
  const amount = inr * config.rateFromINR;

  const formatted = new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: config.fractionDigits,
    maximumFractionDigits: config.fractionDigits,
  }).format(amount);

  return `${config.symbol}${formatted}`;
}

/** Convenience: format rupees (not paise) directly. */
export function formatRupees(rupees: number): string {
  return formatMoney(rupees * 100);
}

/** Inverse: parse a user-typed rupee value into paise. Use for form inputs. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
