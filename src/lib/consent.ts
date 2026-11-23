/**
 * Cookie-consent storage — the single source of truth for whether the visitor
 * has opted into analytics.
 *
 * Lives apart from the banner component so non-React code (main.tsx at boot)
 * can read the choice without importing UI.
 */

export const CONSENT_STORAGE_KEY = 'coco36.cookie-consent';

export type Consent = 'accepted' | 'rejected' | null;

export function readConsent(): Consent {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === 'accepted' || v === 'rejected' ? v : null;
  } catch {
    // Private mode / blocked storage — treat as "not yet decided".
    return null;
  }
}

export function writeConsent(choice: 'accepted' | 'rejected'): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    /* Storage unavailable — the choice applies for this page view only. */
  }
}

/** The banner listens for this and shows again. */
export const CONSENT_REOPEN_EVENT = 'coco36:reopen-cookie-banner';

/** Drop the stored choice and ask the banner to open. */
export function clearConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    /* Storage unavailable — the banner can still open for this view. */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
  }
}
