/** Pure text helpers for meta strings. Shared by server + client. */

/** Markdown → plain text, roughly — good enough for meta/JSON-LD strings. */
export function stripMarkdown(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // links → label
    .replace(/[#>*_`~]/g, '')                  // md punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/** Cut to at most `max` chars on a word boundary, adding an ellipsis if cut. */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:·—–-]+$/, '')}…`;
}

/** Ensure a sentence ends with terminal punctuation. */
export function sentence(text: string): string {
  const t = text.trim();
  return !t || /[.!?…]$/.test(t) ? t : `${t}.`;
}

/** First option that fits within `max` chars, else the last one clipped. */
export function firstThatFits(options: string[], max: number): string {
  for (const o of options) if (o.length <= max) return o;
  return clip(options[options.length - 1] ?? '', max);
}

/** Limits the whole site is held to: titles UNDER 60 chars, descriptions UNDER 155. */
export const TITLE_MAX = 59;
export const DESCRIPTION_MAX = 154;
