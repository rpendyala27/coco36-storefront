/**
 * Public support contact. The only address we publish by default is
 * support@coco36.com. A phone from settings (store.support_phone) is shown
 * only when it looks like a real number — never an empty value or a
 * placeholder such as +91-00000-00000. There is no WhatsApp link.
 */

export const SUPPORT_EMAIL = 'support@coco36.com';

export interface SupportContact {
  /** A publishable phone, or null when settings has none (show the email). */
  phone: string | null;
  email: string;
}

/** A phone number safe to publish. Null means "show the support email instead". */
export function publicSupportPhone(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Letters cover "placeholder", "n/a", "TBD", and wa.me / WhatsApp URLs.
  if (/[a-z]/i.test(trimmed)) return null;
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;

  let national = digits;
  if (national.length === 12 && national.startsWith('91')) national = national.slice(2);
  else if (national.length === 11 && national.startsWith('0')) national = national.slice(1);
  if (national.length < 10) return null;

  // All zeros, a repeated digit, a long zero-run (+91-00000-00000), or a
  // sequential dummy. These are placeholders, not numbers a customer can call.
  if (/^0+$/.test(national)) return null;
  if (/^(\d)\1+$/.test(national)) return null;
  if (/0{5,}/.test(digits)) return null;
  if (national === '1234567890' || national === '0123456789') return null;

  return trimmed;
}

/** Settings email when it is a real address; otherwise the public support inbox. */
export function publicSupportEmail(value: unknown): string {
  if (typeof value !== 'string') return SUPPORT_EMAIL;
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : SUPPORT_EMAIL;
}
