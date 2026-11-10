import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_TEL } from '../lib/supportContact.js';

/** A slice of visible copy. `href` is set for email, phone, and `{label|url}` links. */
export interface TextRun { text: string; href?: string }

const NAMED_LINK = /\{([^{}|]+)\|((?:https?:\/\/|mailto:|tel:)[^}\s]+)\}/g;

/** Split copy into plain text and links. Email and phone are linked; `{label|url}` too. */
export function textRuns(input: string): TextRun[] {
  const runs: TextRun[] = [];
  const contact = new RegExp(`(${SUPPORT_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${SUPPORT_PHONE_DISPLAY})`, 'g');
  const pushPlain = (plain: string) => {
    if (!plain) return;
    for (const part of plain.split(contact)) {
      if (!part) continue;
      if (part === SUPPORT_EMAIL) runs.push({ text: part, href: `mailto:${part}` });
      else if (part === SUPPORT_PHONE_DISPLAY) runs.push({ text: part, href: SUPPORT_PHONE_TEL });
      else runs.push({ text: part });
    }
  };
  let last = 0;
  for (const match of input.matchAll(NAMED_LINK)) {
    const index = match.index ?? 0;
    pushPlain(input.slice(last, index));
    runs.push({ text: match[1], href: match[2] });
    last = index + match[0].length;
  }
  pushPlain(input.slice(last));
  return runs;
}

/** Escape-aware replacement so support email, phone and named links become real anchors. */
export function linkifyHtml(text: string, esc: (s: string) => string): string {
  return textRuns(text).map((run) => {
    const label = esc(run.text);
    if (!run.href) return label;
    const external = /^https?:/i.test(run.href);
    const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${esc(run.href)}"${attrs}>${label}</a>`;
  }).join('');
}
