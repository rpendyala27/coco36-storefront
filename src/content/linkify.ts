import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '../lib/supportContact.js';

/** Escape-aware replacement so support email and phone become real links. */
export function linkifyHtml(text: string, esc: (s: string) => string): string {
  const re = new RegExp(`(${SUPPORT_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${SUPPORT_PHONE_DISPLAY})`, 'g');
  return text.split(re).map((part) => {
    if (part === SUPPORT_EMAIL) return `<a href="mailto:${SUPPORT_EMAIL}">${esc(SUPPORT_EMAIL)}</a>`;
    if (part === SUPPORT_PHONE_DISPLAY) return `<a href="${SUPPORT_PHONE_TEL}">${esc(SUPPORT_PHONE_DISPLAY)}</a>`;
    return esc(part);
  }).join('');
}
