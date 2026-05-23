/**
 * COCO36 — money formatting facade.
 *
 * Thin re-exports of the canonical `lib/currency` module so legacy
 * imports (`formatPrice`, `formatINR`) keep working during the
 * transition to a fully paise-based codebase.
 *
 * New code should import directly from `lib/currency`.
 */
export { formatMoney, formatRupees, rupeesToPaise } from '../lib/currency';
export type { CurrencyCode } from '../lib/currency';

import { formatMoney as _formatMoney } from '../lib/currency';

/**
 * @deprecated  legacy USD entrypoint preserved for the static catalogue.
 *              All new code paths receive paise directly via Supabase.
 *              When the static catalogue is fully migrated, this can be
 *              deleted and all callsites switched to `formatMoney(paise)`.
 *
 * Input contract: amount in INR rupees (NOT USD anymore).
 */
export const formatPrice = (rupees: number): string => _formatMoney(rupees * 100);

/** @deprecated use `formatMoney(paise)` directly. */
export const formatINR = (rupees: number): string => _formatMoney(rupees * 100);
