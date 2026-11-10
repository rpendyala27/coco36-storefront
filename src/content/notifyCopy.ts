/**
 * Customer-facing back-in-stock copy. One place so the form, the cards,
 * and the tests cannot drift.
 */

export const NOTIFY_BUTTON = 'Notify me';

export const NOTIFY_REASSURANCE = "We'll message you once when it's back. No marketing.";

export const NOTIFY_CONFIRM = "You're on the list. We'll message you once when it's back. No marketing.";

export const NOTIFY_UNAVAILABLE = "We couldn't save that just now. Please try again later.";

export const NOTIFY_RATE_LIMIT = 'Please wait a moment, then try again.';

export const NOTIFY_EMAIL_INVALID = 'Enter a valid email address.';

export const NOTIFY_PHONE_INVALID = 'Enter a phone number, or leave it blank.';

export const NOTIFY_AUDIENCE_LABEL = 'Home baker or business (café, bakery, restaurant)?';

export const NOTIFY_PACK_LABEL = "Pack size you'd buy";

export const NOTIFY_PACKS = [
  { value: 'small', label: 'Small (100–250 g)' },
  { value: '500g_1kg', label: '500 g–1 kg' },
  { value: 'bulk', label: 'Bulk (5 kg+)' },
] as const;

export type NotifyPack = (typeof NOTIFY_PACKS)[number]['value'];

export const NOTIFY_AUDIENCES = [
  { value: 'home_baker', label: 'Home baker' },
  { value: 'business', label: 'Business (café, bakery, restaurant)' },
] as const;

export type NotifyAudience = (typeof NOTIFY_AUDIENCES)[number]['value'];
