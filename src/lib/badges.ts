import { isFssaiClaim } from './fssai';

/**
 * Designation badges and the sold-out pill.
 *
 * Designation tags always render, in stock or not, capped at two. Coming Soon
 * is first. A product that is actually sold out also gets an Out of stock pill,
 * unless it is tagged coming-soon — that badge takes the pill's place.
 * The `out-of-stock` designation slug is the pill, not a second badge.
 */

export const COMING_SOON_SLUG = 'coming-soon';
export const OUT_OF_STOCK_SLUG = 'out-of-stock';
export const BADGE_CAP = 2;

export const OUT_OF_STOCK_LABEL = 'Out of stock';
export const OUT_OF_STOCK_SHORT = 'Sold out';

/** Phone-width card chips. Coming Soon must not fall back to the first word. */
export const SHORT_BADGE_LABELS: Record<string, string> = {
  'new-arrival': 'New',
  'limited-edition': 'Limited',
  'coming-soon': 'Soon',
};

const TRAILING_PUNCT = /[\s.…!?,;:]+$/u;

/** "Coming Soon.." → "Coming Soon". Leaves the words inside the label alone. */
export function displayBadgeLabel(label: string): string {
  return label.replace(TRAILING_PUNCT, '').trim();
}

export function shortBadgeLabel(slug: string, label: string): string {
  const mapped = SHORT_BADGE_LABELS[slug];
  if (mapped) return mapped;
  const shown = displayBadgeLabel(label);
  return shown.split(/\s+/)[0] || shown;
}

export interface BadgeChip {
  slug: string;
  label: string;
  shortLabel: string;
  role: 'designation' | 'stock';
}

type TagLike = { slug: string; label: string; kind: string };
type SizeLike = { inStock: boolean };

export function isSoldOut(sizes: readonly SizeLike[]): boolean {
  return sizes.length > 0 && sizes.every((s) => !s.inStock);
}

function chip(slug: string, label: string, role: BadgeChip['role']): BadgeChip | null {
  const shown = role === 'stock' ? label : displayBadgeLabel(label);
  if (!shown || isFssaiClaim(slug, shown)) return null;
  return {
    slug,
    label: shown,
    shortLabel: role === 'stock' ? OUT_OF_STOCK_SHORT : shortBadgeLabel(slug, shown),
    role,
  };
}

export function productBadges(product: {
  sizes: readonly SizeLike[];
  tags?: readonly TagLike[];
  badges?: readonly string[];
}): BadgeChip[] {
  const tags = product.tags ?? [];
  const designationTags = tags.filter((t) => t.kind === 'designation');
  const market = designationTags.filter((t) => t.slug !== OUT_OF_STOCK_SLUG);
  const soldOut = isSoldOut(product.sizes);
  const hasComingSoon = market.some((t) => t.slug === COMING_SOON_SLUG);

  const chips: BadgeChip[] = [];
  if (designationTags.length === 0 && !soldOut) {
    for (const label of (product.badges ?? []).slice(0, BADGE_CAP)) {
      const next = chip('', label, 'designation');
      if (next) chips.push(next);
    }
  } else {
    const coming = market.filter((t) => t.slug === COMING_SOON_SLUG);
    const rest = market.filter((t) => t.slug !== COMING_SOON_SLUG);
    for (const tag of [...coming, ...rest].slice(0, BADGE_CAP)) {
      const next = chip(tag.slug, tag.label, 'designation');
      if (next) chips.push(next);
    }
  }

  if (soldOut && !hasComingSoon) {
    const stock = chip(OUT_OF_STOCK_SLUG, OUT_OF_STOCK_LABEL, 'stock');
    if (stock) chips.unshift(stock);
  }
  return chips;
}

export function useCaseTags<T extends TagLike>(tags: readonly T[] | undefined): T[] {
  return (tags ?? []).filter((t) => t.kind === 'use_case' && !isFssaiClaim(t.slug, t.label));
}
