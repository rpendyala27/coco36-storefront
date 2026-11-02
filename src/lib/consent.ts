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
