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

/** Sentences, terminator included. A trailing fragment with no terminator is kept. */
export function sentences(text: string): string[] {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return [];
  return (t.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

/**
 * Cut to at most `max` chars. A complete sentence inside the window is kept
 * whole, with no ellipsis. An ellipsis is only used when one sentence is
 * itself longer than `max` — that is the case that used to end mid-word
 * ("Stone-ground in…") even though an earlier sentence would have fit.
 */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const fitted = fitWithin(t, max);
  if (fitted.length <= max && /[.!?…]$/.test(fitted) && fitted.length >= Math.floor(max * 0.4)) return fitted;
  const cut = t.slice(0, Math.max(0, max - 1));
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:·—–-]+$/, '')}…`;
}

/**
 * Longest prefix of complete sentences that fits in `max`. When a single
 * sentence is itself too long, cuts on a word boundary and adds an ellipsis.
 */
export function fitWithin(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  let acc = '';
  for (const part of sentences(t)) {
    const next = acc ? `${acc} ${part}` : part;
    if (next.length > max) break;
    acc = next;
  }
  if (acc) return acc;
  // One sentence longer than max: word boundary. The caller decides.
  const cut = t.slice(0, Math.max(0, max - 1));
  const sp = cut.lastIndexOf(' ');
  const body = (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:·—–-]+$/, '');
  return body ? `${body}…` : t.slice(0, max);
}

/**
 * Product meta description: body, then an optional "Origin: …" sentence,
 * then the price/shipping suffix. Drops trailing sentences of the body
 * (origin first, then the body) until the result fits. Never cuts a
 * sentence in half to make room for the suffix.
 */
export function composeProductDescription(base: string, origin: string, from: string, max = DESCRIPTION_MAX): string {
  const parts = sentences(sentence(base));
  const originBit = origin.replace(/\s+/g, ' ').trim();
  const suffix = from.replace(/\s+/g, ' ').trim();
  const candidates: string[] = [];
  const push = (body: string, withOrigin: boolean) => {
    const core = body.trim();
    if (!core) return;
    const o = withOrigin && originBit ? ` ${originBit}` : '';
    candidates.push(`${core}${o} ${suffix}`.replace(/\s+/g, ' ').trim());
  };
  for (let n = parts.length; n >= 1; n--) {
    const body = parts.slice(0, n).join(' ');
    push(body, true);
    push(body, false);
  }
  for (const c of candidates) if (c.length <= max) return c;
  if (suffix.length <= max) return suffix;
  return fitWithin(suffix, max);
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
