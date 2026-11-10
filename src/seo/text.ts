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

/** Split on sentence endings, keeping the terminator on each piece. */
export function sentences(text: string): string[] {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  return (t.match(/[^.!?…]+[.!?…]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/**
 * Longest run of complete sentences that fits in `max`.
 * A sentence is cut (with an ellipsis) only when that one sentence is itself
 * longer than `max`. Callers that used to clip mid-sentence to make room for
 * a suffix should drop a whole sentence instead.
 */
export function fitSentences(text: string, max: number): string {
  let out = '';
  for (const s of sentences(text)) {
    const next = out ? `${out} ${s}` : s;
    if (next.length <= max) out = next;
    else break;
  }
  if (out) return out;
  return clip(sentences(text)[0] ?? '', max);
}

/** First option that fits whole. If none do, keep complete sentences of the first. */
export function firstComplete(options: string[], max: number): string {
  for (const o of options) if (o.length <= max) return o;
  return fitSentences(options[0] ?? '', max);
}

/** Limits the whole site is held to: titles UNDER 60 chars, descriptions UNDER 155. */
export const TITLE_MAX = 59;
export const DESCRIPTION_MAX = 154;
