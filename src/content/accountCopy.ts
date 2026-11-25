/**
 * P37b customer-facing copy for /track, the account order pages and the
 * invoice page. One place so the pages and the tests cannot drift.
 * NEEDS ROHAN'S COPY YES before merge.
 */

// ── /track ──────────────────────────────────────────────────────────────────
export const TRACK_SIGN_IN = 'Sign in with the account you ordered from to track this shipment.';
export const TRACK_NOT_FOUND = 'No shipment found for this AWB.';
export const TRACK_CANCELLED = 'This shipment was cancelled.';
export const TRACK_RETURNED = 'This order was returned.';
/** Manual (non-Shiprocket) AWB: no live courier feed, the page follows the order status. */
export const TRACK_MANUAL_NOTE = 'We update this page as your order moves.';

// ── Invoice page ────────────────────────────────────────────────────────────
export const INVOICE_NOT_YET = 'Your tax invoice will be ready here once your order ships.';
export const INVOICE_CANCELLED_NONE = 'This order was cancelled before it shipped, so no tax invoice was issued.';
export const INVOICE_CANCELLED_NOTE = 'This order was cancelled. This invoice is kept for your records.';
export const INVOICE_FOOTER = 'This is a computer-generated invoice and does not need a signature.';
