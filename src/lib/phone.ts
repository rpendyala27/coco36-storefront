/**
 * Indian mobile numbers (F49). Same rule as the admin API
 * (`normaliseIndianMobile`, lib/validation/common.ts): strip formatting, drop
 * a +91 / 91 / 0 prefix, then `^[6-9]\d{9}$`.
 *
 * Tighter than the API in one way: ten identical digits (9999999999) are a
 * placeholder, not a number. Couriers reject them, so we stop them here.
 */
export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;

export const PHONE_INVALID_MESSAGE = 'Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.';

export function normaliseIndianMobile(input: string): string | null {
  let d = (input ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (!INDIAN_MOBILE_RE.test(d)) return null;
  if (/^(\d)\1{9}$/.test(d)) return null;
  return d;
}

export function isIndianMobile(input: string): boolean {
  return normaliseIndianMobile(input) !== null;
}
