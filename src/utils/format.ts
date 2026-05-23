/**
 * Money formatting facade — re-exports the canonical currency module.
 *
 * All new code should import directly from `lib/currency`. This shim
 * exists only so older imports of `from '../utils/format'` keep resolving.
 */
export { formatMoney, formatRupees, rupeesToPaise } from '../lib/currency';
export type { CurrencyCode } from '../lib/currency';
