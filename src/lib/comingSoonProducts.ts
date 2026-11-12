import type { Product } from '../types';
import { COMING_SOON_SLUG } from './badges';

/** Active products tagged coming-soon. Anon reads already hide inactive rows. */
export function comingSoonProducts(products: readonly Product[]): Product[] {
  return products.filter((p) =>
    (p.tags ?? []).some((t) => t.kind === 'designation' && t.slug === COMING_SOON_SLUG),
  );
}
